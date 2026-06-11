
import type { Metadata } from 'next';
import "@/index.css";

export const metadata: Metadata = {
    title: 'RentalHub — Property Rental SaaS',
    description: 'RentalHub — Property Rental SaaS Application',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    );
}
