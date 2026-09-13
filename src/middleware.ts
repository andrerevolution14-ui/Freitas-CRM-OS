import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'freitas-renovacoes-secret-2024-super-secure',
})

export const config = {
  matcher: ['/dashboard/:path*', '/leads/:path*', '/obras/:path*', '/subempreiteiros/:path*', '/notas/:path*'],
}
