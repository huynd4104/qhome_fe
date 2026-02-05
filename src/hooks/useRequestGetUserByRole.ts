import { useState, useEffect } from 'react';

export interface User {
    id: string;
    name: string;
}

const fetchUsersByRoleAPI = async (role: string): Promise<User[]> => {
    console.log(`Fetching users with role: ${role}...`);

    if (role === 'Finance') {
        return [
            { id: 'fin-001', name: 'Nguyễn Thị Kế Toán' },
            { id: 'fin-002', name: 'Trần Văn Tài Chính' },
        ];
    }
    if (role === 'System') {
        return [
            { id: 'main-001', name: 'Lê Văn Thợ Sửa' },
            { id: 'main-002', name: 'Phạm Hùng Kỹ Thuật' },
        ];
    }
    return [];
};


export const useUsersByRole = (role: string | null) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        // Just call api when have role
        if (!role) {
            setUsers([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchedUsers = await fetchUsersByRoleAPI(role);
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Failed to fetch users by role", error);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [role]);

    return { users, loading };
};