'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Phone Orders', href: '/orders' },
    { name: 'Customers', href: '/customers' },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Bills', href: '/billing' },
    { name: 'Mills', href: '/mills' },
    { name: 'Reports', href: '/reports' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col">
            {/* Logo/Header */}
            <div className="p-6 border-b border-blue-700">
                <h1 className="text-2xl font-bold">R.K. Textiles</h1>
                <p className="text-blue-200 text-sm mt-1">Management System</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center justify-center px-4 py-3 rounded-lg transition-all ${isActive
                                ? 'bg-blue-700 text-white shadow-lg'
                                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                                }`}
                        >
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-blue-700">
                <div className="text-xs text-blue-300">
                    <p>© 2024 R.K. Textiles</p>
                    <p className="mt-1">Academic Project</p>
                </div>
            </div>
        </div>
    );
}
