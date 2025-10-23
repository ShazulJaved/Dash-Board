import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { User } from 'firebase/auth';

interface UpdateUserData {
    displayName?: string;
    phoneNumber?: string;
    department?: string;
    position?: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'pending' | 'inactive';
    updatedAt?: Date;
  }

export function useUser() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const updateUser = async (userId: string, userData: UpdateUserData) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/user/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            return await response.json();
        } catch (error: any) {
            console.error('Update user error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'Failed to update user'
            });
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        updateUser,
        isLoading
    };
}

