import {type ReactNode, useEffect, useState} from 'react';
import {message} from 'antd';
import {AuthContext} from './AuthContextInstance';
import {authenticationAPI, onSessionExpired} from "../services";

export function AuthProvider({children}: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => authenticationAPI.isAuthenticated());
    const [loginVisible, setLoginVisible] = useState(false);

    // Subscribe to session expiry events
    useEffect(() => {
        const unsubscribe = onSessionExpired(() => {
            // Only show message if user was previously authenticated
            if (isAuthenticated) {
                setIsAuthenticated(false);
                message.warning('Your session has expired. Please log in again.');
            }
        });
        return unsubscribe;
    }, [isAuthenticated]);

    const login = async (username: string, password: string) => {
        const response = await authenticationAPI.login(username, password);
        if (response.data) {
            setIsAuthenticated(true);
            setLoginVisible(false);
            return {success: true};
        }
        return {success: false, error: response.error};
    };

    const logout = () => {
        authenticationAPI.logout();
        setIsAuthenticated(false);
    };

    const showLogin = () => setLoginVisible(true);
    const hideLogin = () => setLoginVisible(false);

    return (
            <AuthContext.Provider value={{isAuthenticated, login, logout, showLogin, hideLogin, loginVisible}}>
                {children}
            </AuthContext.Provider>
    );
}
