import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import type {WebSiteStyle} from '../models';
import {themeAPI} from '../services';
import {deepMerge} from '../tools';
import {ThemeContext} from './ThemeContextInstance';

function flattenToCssVars(style: WebSiteStyle, prefix: string[] = []): Record<string, string> {
    const vars: Record<string, string> = {};

    for (const [key, value] of Object.entries(style)) {
        const nextPrefix = [...prefix, key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(vars, flattenToCssVars(value as WebSiteStyle, nextPrefix));
        } else if (value !== undefined && value !== null) {
            const cssName = `--${nextPrefix.join('-')}`.replace(/[^a-zA-Z0-9-_]/g, '-');
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

    const value = useMemo(() => ({
        defaultStyle,
        activeStyle,
        setDefaultStyle,
        resetToDefault,
        applyPageStyle,
    }), [activeStyle, applyPageStyle, defaultStyle, resetToDefault, setDefaultStyle]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

