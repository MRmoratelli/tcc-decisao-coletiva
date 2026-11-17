import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import type { Review } from './ai.js';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL_V2;
const pepper = process.env.AUTH_PEPPER;
if (!connectionString || !pepper || pepper.length < 32) throw new Error('DATABASE_URL_V2 e AUTH_PEPPER forte são obrigatórios.');
const pool = new Pool({connectionString, max: 5});

function hashCredential(token: string) {
  return createHmac('sha256', pepper as string).update(token).digest('hex');
}
function credential() { return randomBytes(32).toString('base64url'); }

export type Identity = {
  room: {id: string; code: string; topic: string; proposal: string; proposal_review: Review};
  role: 'moderator' | 'participant';
  participantId?: string;
  alias?: string;
};

export async function createRoom(topic: string, proposal: string, review: Review, count: number) {
  const id = randomUUID();
  const code = randomBytes(5).toString('hex').toUpperCase();
  const moderatorCredential = credential();
  const client = await pool.connect();
  const participants: Array<{alias:string; credential:string}> = [];
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO dc2_rooms(id,code,topic,proposal,proposal_review,moderator_hash) VALUES($1,$2,$3,$4,$5,$6)',
      [id,code,topic,proposal,JSON.stringify(review),hashCredential(moderatorCredential)]
    );
    for(let n=1;n<=count;n++) {
      const alias = 'P' + String(n).padStart(2,'0');
      const secret = credential();
      await client.query('INSERT INTO dc2_participants(id,room_id,alias,secret_hash) VALUES($1,$2,$3,$4)',[randomUUID(),id,alias,hashCredential(secret)]);
      participants.push({alias,credential:secret});
    }
    await client.query('COMMIT');
    return {code, moderatorCredential, participants};
  } catch(e) { await client.query('ROLLBACK'); throw e; }
  finally {client.release();}
}

export async function authorize(code: string, token: string): Promise<Identity | null> {
  if (!/^[A-F0-9]{10}$/.test(code) || typeof token !== 'string' || token.length > 128) return null;
  const lookup = await pool.query(
    'SELECT id, code, topic, proposal, proposal_review, moderator_hash FROM dc2_rooms WHERE code=$1',
    [code]
  );
  const room = lookup.rows[0];
  if (!room) return null;
  const hashed = hashCredential(token);
  const view = {id:room.id,code:room.code,topic:room.topic,proposal:room.proposal,proposal_review:room.proposal_review};
  if (hashed === room.moderator_hash) return {room:view,role:'moderator'};
  const participant = await pool.query('SELECT id,alias FROM dc2_participants WHERE room_id=$1 AND secret_hash=$2',[room.id,hashed]);
  if (!participant.rows[0]) return null;
  return {room:view,role:'participant',participantId:participant.rows[0].id,alias:participant.rows[0].alias};
}

export async function roomView(identity: Identity) {
  // Antes da primeira contribuição, o participante não recebe argumentos alheios.
  const rows = await pool.query(
    'SELECT c.id,p.alias,c.text,c.review,c.user_choice,c.created_at,c.participant_id FROM dc2_contributions c JOIN dc2_participants p ON p.id=c.participant_id WHERE c.room_id=$1 ORDER BY c.created_at,c.id',
    [identity.room.id]
  );
  const contributed = identity.role === 'moderator' || rows.rows.some(row=>row.participant_id===identity.participantId);
  return {room:identity.room,role:identity.role,alias:identity.alias ?? null,canViewGroup:contributed,contributions:contributed?rows.rows.map(({participant_id,...rest})=>rest):[]};
}

export async function addContribution(identity: Identity,text: string,review: Review,userChoice: 'ENVIAR' | 'ENVIAR_COM_RESSALVA',receiptHash:string) {
  if (identity.role!=='participant' || !identity.participantId) throw new Error('Acesso exclusivo de participante.');
  await pool.query('INSERT INTO dc2_contributions(id,room_id,participant_id,text,review,user_choice,receipt_hash) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),identity.room.id,identity.participantId,text,JSON.stringify(review),userChoice,receiptHash]);
}
export async function healthy() { await pool.query('SELECT 1'); }
