import axios from 'axios';


const SPRING_BOOT_BASE_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_API_URL || 'http://localhost:8080';

const api = axios.create({
    baseURL: SPRING_BOOT_BASE_URL,
    timeout: 30000000000000000,
});


export const getSpringBootServices = async () => {
    try {
        const response = await api.get('/services');
        return response.data;
    } catch (error) {
        console.error('Error fetching /services from Health-Check_Utility:', error.message);
        return [];
    }
};

export const getSpringBootService = async (id) => {
    try {
        const response = await api.get(`/services/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching service ${id}:`, error.message);
        return null;
    }
};


export const getSpringBootHistory = async () => {
    try {
        const response = await api.get('/monitor/history');
        return response.data;
    } catch (error) {
        console.error('Error fetching global history:', error.message);
        return [];
    }
};

export const getSpringBootServiceHistory = async (id) => {
    try {
        const response = await api.get(`/services/${id}/history`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching history for service ${id}:`, error.message);
        return [];
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


export const updateService = async (id, serviceData) => {
    try {
        const response = await api.put(`/services/${id}`, serviceData);
        return response.data;
    } catch (error) {
        console.error(`Error updating service ${id} in Health-Check_Utility:`, error.message);
        throw error;
    }
};

export const deleteService = async (id) => {
    try {
        const response = await api.delete(`/services/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting service ${id} from Health-Check_Utility:`, error.message);
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
