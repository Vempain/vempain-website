import {Footer} from "antd/es/layout/layout";
import BuildInfoData from "../buildInfo.json";
import type {BuildInfo} from "@vempain/vempain-auth-frontend";

function BottomFooter() {
    const buildInfo: BuildInfo = BuildInfoData;

    return (
            <Footer style={{textAlign: "center"}}
                    dangerouslySetInnerHTML={{
                        __html: import.meta.env.VITE_APP_VEMPAIN_COPYRIGHT_FOOTER + "<br/>"
                                + "v" + buildInfo.version + " " + " built: " + buildInfo.buildTime + "<br/>"
                                + import.meta.env.VITE_APP_POWERED_BY_VEMPAIN
                    }}/>
    );
}

export {BottomFooter};