import { z } from 'zod';
export function runtimeConfig(env:Record<string,string|undefined>){
 if(env.V2_DATABASE_ISOLATED!=='true')throw new Error('Confirme o banco V2 isolado antes de iniciar.');
 const schema=z.object({database:z.string().min(1),pepper:z.string().min(32),signingKey:z.string().min(32),port:z.coerce.number().int().min(1).max(65535),host:z.string().min(1),origin:z.string().url().optional()});
 const parsed=schema.safeParse({database:env.DATABASE_URL_V2,pepper:env.AUTH_PEPPER,signingKey:env.REVIEW_SIGNING_KEY,port:env.PORT||env.API_PORT||8787,host:env.API_HOST||(env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'),origin:env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL||undefined});
 if(!parsed.success)throw new Error('Configuração V2 ausente ou inválida. Verifique nomes das variáveis privadas.');
 const c=parsed.data;
 if(c.pepper===c.signingKey)throw new Error('Segredos de autenticação e parecer devem ser diferentes.');
 if(env.NODE_ENV==='production'&&(!c.origin||new URL(c.origin).protocol!=='https:'))throw new Error('PUBLIC_ORIGIN HTTPS é obrigatória em produção.');
 if(c.origin&&new URL(c.origin).origin!==c.origin)throw new Error('PUBLIC_ORIGIN deve conter somente a origem, sem caminho.');
 return {...c,production:env.NODE_ENV==='production',commit:env.RENDER_GIT_COMMIT||env.APP_COMMIT||null,aiConfigured:Boolean(env.GEMINI_API_KEY)};
}
