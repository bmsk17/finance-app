// === ARQUIVO: src/middleware.ts ===
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// O Next.js (Turbopack) exige que a função seja declarada exatamente assim
export default async function middleware(req: NextRequest) {
  // Pega o "crachá" (token) do usuário logado
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Verifica se o usuário está tentando acessar a tela de login
  const isLoginPage = req.nextUrl.pathname.startsWith('/login');

  // REGRA 1: Se NÃO tem crachá e NÃO está na tela de login, expulsa para o login
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // REGRA 2: Se JÁ TEM crachá e tenta acessar o login de novo, manda de volta pro Dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Se estiver tudo certo, deixa o usuário passar
  return NextResponse.next();
}

export const config = {
  // O Segurança protege o site inteiro, exceto as pastas do sistema (imagens, api do login, etc)
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};