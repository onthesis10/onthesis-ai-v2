import { createCommand } from 'lexical';

export const APPLY_BLOCK_TYPE_COMMAND = createCommand('APPLY_BLOCK_TYPE_COMMAND');
export const APPLY_LIST_TYPE_COMMAND = createCommand('APPLY_LIST_TYPE_COMMAND');
export const INSERT_CITATION_COMMAND = createCommand('INSERT_CITATION_COMMAND');

// [NEW] Production Commands
export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND');
export const INSERT_TABLE_COMMAND = createCommand('INSERT_TABLE_COMMAND');
export const ADD_REVIEW_COMMENT_COMMAND = createCommand('ADD_REVIEW_COMMENT_COMMAND');