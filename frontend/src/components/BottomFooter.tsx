import {Footer} from "antd/es/layout/layout";
import BuildInfoData from "../buildInfo.json";
import type {BuildInfo} from "@vempain/vempain-auth-frontend";

function getPoweredByConfig() {
    const defaultConfig = {
        text: "Powered by",
        url: "https://vempain.poltsi.fi/",
        label: "Vempain System"
    };

    const text = import.meta.env.VITE_APP_POWERED_BY_TEXT as string | undefined;
    const url = import.meta.env.VITE_APP_POWERED_BY_URL as string | undefined;
    const label = import.meta.env.VITE_APP_POWERED_BY_LABEL as string | undefined;

    if (text && url && label) {
        return {text, url, label};
    }

    return defaultConfig;
}

function BottomFooter() {
    const buildInfo: BuildInfo = BuildInfoData;
    const poweredBy = getPoweredByConfig();

    return (
            <Footer style={{textAlign: "center"}}>
                <div>{import.meta.env.VITE_APP_VEMPAIN_COPYRIGHT_FOOTER}</div>
                <div>{`v${buildInfo.version} built: ${buildInfo.buildTime}`}</div>
                <div>
                    {poweredBy.text}{" "}
                    <a href={poweredBy.url} target="_blank" rel="noopener noreferrer">
                        {poweredBy.label}
                    </a>
                </div>
            </Footer>
    );
}

export {BottomFooter};