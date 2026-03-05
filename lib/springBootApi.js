import axios from 'axios';


const SPRING_BOOT_BASE_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_API_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: SPRING_BOOT_BASE_URL,
    timeout: 30000,
});


export const getSpringBootServices = async () => {
    try {
        const response = await api.get('/services');
        return response.data;
    } catch (error) {
        console.error('Error fetching /services from Health-Check_Utility:', error.message);
        return null;
    }
};


export const getSpringBootHistory = async () => {
    try {
        const response = await api.get('/monitor/history');
        return response.data;
    } catch (error) {
        console.error('Error fetching /monitor/history from Health-Check_Utility:', error.message);
        return null;
    }
};


export const triggerSpringBootRefresh = async () => {
    try {
        const response = await api.post('/monitor/refresh');
        return response.data;
    } catch (error) {
        console.error('Error triggering refresh in Health-Check_Utility:', error.message);
        return null;
    }
};


export const registerService = async (serviceData) => {
    try {
        const response = await api.post('/services', serviceData);
        return response.data;
    } catch (error) {
        console.error('Error registering service in Health-Check_Utility:', error.message);
        throw error;
    }
};


export const mapSpringBootToFrontend = (services, history) => {
    if (!services || !Array.isArray(services)) return [];

    const historyArray = Array.isArray(history) ? history : [];

    const parseDate = (d) => {
        if (!d) return new Date(0);
        if (Array.isArray(d)) {
            return new Date(d[0], d[1] - 1, d[2], d[3] || 0, d[4] || 0, d[5] || 0);
        }
        return new Date(d);
    };

    return services.map(svc => {
        const svcHistory = historyArray
            .filter(h => h.serviceId == svc.id)
            .sort((a, b) => parseDate(b.checkedAt) - parseDate(a.checkedAt));

        const latest = svcHistory[0] || {};

        let status = 'unknown';
        let statusText = 'Checking...';

        if (latest && latest.status) {
            if (latest.status === 'UP') {
                if (latest.responseTime > 3000) {
                    status = 'degraded';
                    statusText = 'Degraded';
                } else {
                    status = 'operational';
                    statusText = 'Operational';
                }
            } else if (latest.status === 'DOWN') {
                status = 'outage';
                statusText = 'Outage';
            }
        }

        return {
            id: svc.id.toString(),
            name: svc.serviceName,
            url: svc.healthUrl,
            description: svc.owner ? `${svc.owner} (${svc.criticality || 'Normal'})` : `Criticality: ${svc.criticality || 'Normal'}`,
            icon: svc.icon || (svc.serviceName.toLowerCase().includes('db') || svc.serviceName.toLowerCase().includes('data') ? '🗄️' : '🔗'),
            category: svc.category || 'API',
            status,
            statusText,
            responseTime: latest.responseTime || 0,
            lastChecked: latest.checkedAt ? parseDate(latest.checkedAt).toISOString() : null,
            history: svcHistory.map(h => ({
                status: h.status === 'UP' ? 'operational' : 'outage',
                responseTime: h.responseTime,
                timestamp: parseDate(h.checkedAt).toISOString(),
            })).slice(0, 50),
        };
    });
}
