interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
};

export default function StatsCard({ title, value, subtitle, color }: StatsCardProps) {
    return (
        <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow ${colorClasses[color]}`}>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
    );
}
