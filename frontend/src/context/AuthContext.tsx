import {type ReactNode, useState} from 'react';
import {AuthContext} from './AuthContextInstance';
import {authenticationAPI} from "../services";

export function AuthProvider({children}: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => authenticationAPI.isAuthenticated());
    const [loginVisible, setLoginVisible] = useState(false);

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
