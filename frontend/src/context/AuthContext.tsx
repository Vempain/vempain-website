import {type ReactNode, useEffect, useRef, useState} from 'react';
import {message} from 'antd';
import {AuthContext} from './AuthContextInstance';
import {authenticationAPI, onSessionExpired} from "../services";

export function AuthProvider({children}: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => authenticationAPI.isAuthenticated());
    const [loginVisible, setLoginVisible] = useState(false);

    // Use ref to track auth state for the callback to avoid stale closure
    const isAuthenticatedRef = useRef(isAuthenticated);
    useEffect(() => {
        isAuthenticatedRef.current = isAuthenticated;
    }, [isAuthenticated]);

    // Subscribe to session expiry events - only once on mount
    useEffect(() => {
        return onSessionExpired(() => {
            // Only show message if user was previously authenticated
            if (isAuthenticatedRef.current) {
                setIsAuthenticated(false);
                message.warning('Your session has expired. Please log in again.');
            }
        });
    }, []);

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
