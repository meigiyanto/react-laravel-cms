import { createContext, useContext } from 'react';

export type AuthProfile = {
    id: number;
    name: string;
    email: string;
    role: {
        id: number;
        name: string;
        slug: string;
    } | null;
    permissions: string[];
};

export const AuthProfileContext =
    createContext<AuthProfile | null>(null);

export function useAuthProfile() {
    return useContext(AuthProfileContext);
}