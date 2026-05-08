/** @type {import('next').Config} */
const nextConfig = {
    reactStrictMode: true,
    serverExternalPackages: ['sequelize', 'mariadb', 'bcryptjs', 'multer', 'pdfkit'],
    typescript: {
        ignoreBuildErrors: true,
    },
    async rewrites() {
        return [
            {
                source: '/uploads/:path*',
                destination: '/api/uploads/:path*',
            },
        ];
    },
};

export default nextConfig;
