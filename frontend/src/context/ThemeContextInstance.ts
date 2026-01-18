import {createContext, useContext} from 'react';
import type {ThemeConfig} from 'antd/es/config-provider/context';
import type {WebSiteStyle} from '../models';

export interface ThemeContextType {
    defaultStyle: WebSiteStyle | null;
    activeStyle: WebSiteStyle | null;
    antdTheme: ThemeConfig;
    setDefaultStyle: (style: WebSiteStyle) => void;
    resetToDefault: () => void;
    applyPageStyle: (style: WebSiteStyle | null | undefined) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
