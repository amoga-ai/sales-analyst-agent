// Holds the AI's suggested questions for the open report, so the editor's AI wand can list them as options.
import { createContext, useContext } from 'react';

export const WandSuggestionsContext = createContext<string[]>([]);

// Returns the suggested questions for the report open in the editor. Empty when there are none.
export function useWandSuggestions() {
return useContext(WandSuggestionsContext);
}