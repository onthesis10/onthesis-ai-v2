import { ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule } from 'ag-grid-community';
import {
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    TextEditorModule,
    NumberEditorModule,
    DateEditorModule,
    CellStyleModule,
    RowSelectionModule,
    EventApiModule,
    ValidationModule,
    PaginationModule,
    CsvExportModule
} from 'ag-grid-community';

export const registerAgGridModules = () => {
    ModuleRegistry.registerModules([
        ClientSideRowModelModule,

        // Filters
        TextFilterModule,
        NumberFilterModule,
        DateFilterModule,

        // Editors
        TextEditorModule,
        NumberEditorModule,
        DateEditorModule,

        // Features
        CellStyleModule,
        RowSelectionModule,
        EventApiModule,
        ValidationModule,
        PaginationModule,
        CsvExportModule
    ]);
};
