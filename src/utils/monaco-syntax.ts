import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { gcodeFDMLanguage, gcodeCNCLanguage } from "@duet3d/monacotokens";

const languageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: ";",
  },
};

monaco.languages.register({ id: "gcode-fdm" });
monaco.languages.setMonarchTokensProvider("gcode-fdm", gcodeFDMLanguage);
monaco.languages.setLanguageConfiguration("gcode-fdm", languageConfiguration);

monaco.languages.register({ id: "gcode-cnc" });
monaco.languages.setMonarchTokensProvider("gcode-cnc", gcodeCNCLanguage);
monaco.languages.setLanguageConfiguration("gcode-cnc", languageConfiguration);
