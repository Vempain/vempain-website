import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import type {ThemeConfig} from 'antd/es/config-provider/context';
import {theme as antdThemeUtil} from 'antd';
import type {WebSiteStyle} from '../models';
import {themeAPI} from '../services';
import {deepMerge} from '../tools';
import {ThemeContext} from './ThemeContextInstance';

function toKebabCase(input: string): string {
    return input
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase();
}

function flattenToCssVars(style: WebSiteStyle, prefix: string[] = []): Record<string, string> {
    const vars: Record<string, string> = {};

    for (const [key, value] of Object.entries(style)) {
        const nextPrefix = [...prefix, toKebabCase(key)];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(vars, flattenToCssVars(value as WebSiteStyle, nextPrefix));
        } else if (value !== undefined && value !== null) {
            const cssName = `--${nextPrefix.join('-')}`.replace(/[^a-z0-9-_]/gi, '-');
            vars[cssName] = String(value);
        }
    }

    return vars;
}

function applyCssVariables(style: WebSiteStyle | null) {
    const root = document.documentElement;

    // Clear previously applied variables
    // We only clear vars we set by tracking in a dataset key
    const previous = (root.dataset.vempainStyleVars ?? '').split(',').filter(Boolean);
    for (const name of previous) {
        root.style.removeProperty(name);
    }

    if (!style) {
        root.dataset.vempainStyleVars = '';
        return;
    }

    const vars = flattenToCssVars(style);
    const keys = Object.keys(vars);
    for (const [name, value] of Object.entries(vars)) {
        root.style.setProperty(name, value);
    }
    root.dataset.vempainStyleVars = keys.join(',');
}

export function ThemeProvider({children}: {children: ReactNode}) {
    const [defaultStyle, setDefaultStyleState] = useState<WebSiteStyle | null>(null);
    const [activeStyle, setActiveStyle] = useState<WebSiteStyle | null>(null);

    const setDefaultStyle = useCallback((style: WebSiteStyle) => {
        setDefaultStyleState(style);
        setActiveStyle(style);
    }, []);

    const resetToDefault = useCallback(() => {
        setActiveStyle(defaultStyle);
    }, [defaultStyle]);

    const applyPageStyle = useCallback((style: WebSiteStyle | null | undefined) => {
        if (!style) {
            setActiveStyle(defaultStyle);
            return;
        }

        if (!defaultStyle) {
            setActiveStyle(style);
            return;
        }

        // nested merge: page style overrides default style
        setActiveStyle(deepMerge(defaultStyle as Record<string, unknown>, style as Record<string, unknown>));
    }, [defaultStyle]);

    // Fetch default style on startup
    useEffect(() => {
        let mounted = true;
        void (async () => {
            const resp = await themeAPI.getDefaultStyle();
            if (!mounted) return;
            if (resp.data) {
                setDefaultStyle(resp.data);
            } else {
                // if default style is missing, just keep null and allow app css to drive defaults
                // console.warn('Default style not loaded', resp.error);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [setDefaultStyle]);

    // Apply current active style to CSS variables on change
    useEffect(() => {
        applyCssVariables(activeStyle);
    }, [activeStyle]);

    function getString(obj: unknown, path: string[]): string | undefined {
        let current: unknown = obj;
        for (const key of path) {
            if (!current || typeof current !== 'object') return undefined;
            current = (current as Record<string, unknown>)[key];
        }
        return typeof current === 'string' ? current : undefined;
    }

    const antdTheme = useMemo<ThemeConfig>(() => {
        // We keep this mapping intentionally small and safe.
        // Any missing token falls back to AntD defaults.
        const token: ThemeConfig['token'] = {};
        console.log("Default token config:", JSON.stringify(token));

        const bg = activeStyle ? getString(activeStyle, ['color', 'background']) : undefined;
        const surface = activeStyle ? getString(activeStyle, ['color', 'surface']) : undefined;
        const text = activeStyle ? getString(activeStyle, ['color', 'text']) : undefined;
        const textMuted = activeStyle ? getString(activeStyle, ['color', 'textMuted']) : undefined;
        const border = activeStyle ? getString(activeStyle, ['color', 'border']) : undefined;
        const primary = activeStyle ? getString(activeStyle, ['color', 'primary']) : undefined;
        const textSecondary = activeStyle ? getString(activeStyle, ['color', 'secondary']) : undefined;
        const primaryHover = activeStyle ? getString(activeStyle, ['color', 'primaryHover']) : undefined;
        const link = activeStyle ? getString(activeStyle, ['color', 'link']) : undefined;
        const success = activeStyle ? getString(activeStyle, ['color', 'success']) : undefined;
        const warning = activeStyle ? getString(activeStyle, ['color', 'warning']) : undefined;
        const danger = activeStyle ? getString(activeStyle, ['color', 'danger']) : undefined;

        if (primary) token.colorPrimary = primary;
        if (textSecondary) token.colorTextSecondary = textSecondary;
        if (textSecondary) token.colorFillSecondary = textSecondary;
        if (primaryHover) token.colorPrimaryHover = primaryHover;
        if (link) token.colorLink = link;
        if (success) token.colorSuccess = success;
        if (warning) token.colorWarning = warning;
        if (danger) token.colorError = danger;

        if (bg) token.colorBgBase = bg;
        if (surface) token.colorBgContainer = surface;
        if (border) token.colorBorder = border;
        if (text) token.colorText = text;
        if (textMuted) token.colorTextSecondary = textMuted;

        return {
            cssVar: {
                key: 'vempain',
                prefix: 'vempain',
            },
            algorithm: antdThemeUtil.darkAlgorithm,
            token,
        };
    }, [activeStyle]);

    const value = useMemo(() => ({
        defaultStyle,
        activeStyle,
        antdTheme,
        setDefaultStyle,
        resetToDefault,
        applyPageStyle,
    }), [activeStyle, antdTheme, applyPageStyle, defaultStyle, resetToDefault, setDefaultStyle]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
