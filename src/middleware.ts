import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/leads/:path*', '/obras/:path*', '/subempreiteiros/:path*', '/notas/:path*'],
}
