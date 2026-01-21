// core/edit/searchAndReplace removed - not needed for autocomplete
const validateSingleEdit = (
  oldString: any,
  newString: any,
  replaceAll: any,
) => ({
  oldString: oldString || "",
  newString: newString || "",
  replaceAll: replaceAll || false,
});
const executeFindAndReplace = async (
  _fileContents: string,
  _oldString: string,
  _newString: string,
  _replaceAll: boolean,
  _startLine: number,
): Promise<string> => {
  return _fileContents; // Edit functionality removed - return original content
};
const validateSearchAndReplaceFilepath = async (filepath: string, ide: any) =>
  filepath;
import { v4 as uuid } from "uuid";
import { applyForEditTool } from "../../redux/thunks/handleApplyStateUpdate";
import { ClientToolImpl } from "./callClientTool";

export const singleFindAndReplaceImpl: ClientToolImpl = async (
  args,
  toolCallId,
  extras,
) => {
  // Note that this is fully duplicate of what occurs in args preprocessing
  // This is to handle cases where file changes while tool call is pending
  const { oldString, newString, replaceAll } = validateSingleEdit(
    args.old_string,
    args.new_string,
    args.replace_all,
  );
  const fileUri = await validateSearchAndReplaceFilepath(
    args.filepath,
    extras.ideMessenger.ide,
  );

  const editingFileContents = await extras.ideMessenger.ide.readFile(fileUri);
  const newFileContents = await executeFindAndReplace(
    editingFileContents,
    oldString,
    newString,
    replaceAll ?? false,
    0,
  );

  // Apply the changes to the file
  const streamId = uuid();
  void extras.dispatch(
    applyForEditTool({
      streamId,
      toolCallId,
      text: newFileContents,
      filepath: fileUri,
      isSearchAndReplace: true,
    }),
  );

  // Return success - applyToFile will handle the completion state
  return {
    respondImmediately: false, // Let apply state handle completion
    output: undefined,
  };
};
