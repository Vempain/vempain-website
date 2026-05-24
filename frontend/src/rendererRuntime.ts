import type {RendererRuntime} from '@vempain/vempain-rt-renderer';
import {fileAPI, pageAPI} from './services';
import {toFrontendPagePath} from './tools';

export const rendererRuntime: RendererRuntime = {
    pageAPI,
    fileAPI,
    routes: {
        toFrontendPagePath,
    },
};

