import { useMemo, useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
    type ColDef,
    ModuleRegistry,
    ClientSideRowModelModule,
    ValidationModule,
    TextEditorModule,
    NumberEditorModule,
    SelectEditorModule,
    RowSelectionModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CustomFilterModule,
    CellStyleModule,
    EventApiModule,
    themeQuartz,
    iconSetQuartzLight
} from 'ag-grid-community'
import { useThemeStore } from '@/store/themeStore' // Import Theme Store

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ValidationModule,
    TextEditorModule,
    NumberEditorModule,
    SelectEditorModule,
    RowSelectionModule,
    TextFilterModule,
    NumberFilterModule,
    DateFilterModule,
    CustomFilterModule,
    CellStyleModule,
    EventApiModule
]);

// Light Mode Theme
const lightTheme = themeQuartz
    .withPart(iconSetQuartzLight)
    .withParams({
        backgroundColor: "rgba(255, 255, 255, 0.95)", // More opaque for readability
        borderColor: "#E5E7EB", // Visible border
        browserColorScheme: "light",
        columnBorder: true,
        fontFamily: "'Inter', Arial, sans-serif",
        foregroundColor: "#1F2937",
        headerBackgroundColor: "#F3F4F6",
        headerFontSize: 13,
        headerFontWeight: 600,
        headerTextColor: "#4B5563",
        oddRowBackgroundColor: "#F9FAFB",
        rowBorder: true,
        sidePanelBorder: true,
        spacing: 8,
        wrapperBorder: true,
        wrapperBorderRadius: 12,
        cellHorizontalPaddingScale: 1.2,
        rowVerticalPaddingScale: 1.2,
        accentColor: "#007AFF",
    });

// Dark Mode Theme (Ocean Blue / Navy Dark Match)
const darkTheme = themeQuartz
    .withParams({
        accentColor: "#0EA5E9", // Sky 500
        backgroundColor: "rgba(15, 23, 42, 0.9)", // Slate 900 more opaque
        borderColor: "rgba(255, 255, 255, 0.15)", // More visible border
        borderRadius: 12,
        browserColorScheme: "dark",
        cellHorizontalPaddingScale: 1.2,
        chromeBackgroundColor: { ref: "backgroundColor" },
        columnBorder: true,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        foregroundColor: "#E2E8F0",
        headerBackgroundColor: "rgba(30, 41, 59, 0.95)", // Slate 800
        headerFontSize: 13,
        headerFontWeight: 600,
        headerTextColor: "#F8FAFC",
        headerVerticalPaddingScale: 1.1,
        iconSize: 16,
        rowBorder: true,
        rowVerticalPaddingScale: 1.3,
        sidePanelBorder: true,
        spacing: 8,
        wrapperBorder: true,
        wrapperBorderRadius: 12,
        oddRowBackgroundColor: "rgba(255, 255, 255, 0.05)",
    });

// Happy Mode Theme (Warm/Tropical)
const happyTheme = themeQuartz
    .withPart(iconSetQuartzLight)
    .withParams({
        backgroundColor: "rgba(255, 252, 245, 0.95)", // Warm white more opaque
        borderColor: "#FED7AA", // Orange 200 border
        browserColorScheme: "light",
        accentColor: "#FB923C", // Orange 400
        columnBorder: true,
        fontFamily: "'Inter', Arial, sans-serif",
        foregroundColor: "#57534e", // Stone 600
        headerBackgroundColor: "rgba(255, 247, 237, 0.95)", // Orange 50
        headerFontSize: 13,
        headerFontWeight: 700,
        headerTextColor: "#78716c", // Stone 500
        oddRowBackgroundColor: "rgba(255, 247, 237, 0.8)",
        rowBorder: true,
        sidePanelBorder: true,
        spacing: 8,
        wrapperBorder: true,
        wrapperBorderRadius: 12,
        cellHorizontalPaddingScale: 1.2,
        rowVerticalPaddingScale: 1.2,
    });

interface AgDataGridProps {
    rowData: any[]
    columnDefs: ColDef[]
    onGridReady?: (params: any) => void
    onCellValueChanged?: (params: any) => void
}

export const AgDataGrid = ({
    rowData,
    columnDefs,
    onGridReady,
    onCellValueChanged,
}: AgDataGridProps) => {
    const { theme } = useThemeStore()

    const defaultColDef = useMemo<ColDef>(
        () => ({
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            flex: 1,
            minWidth: 120,
        }),
        []
    )

    const currentTheme = useMemo(() => {
        if (theme === 'dark') return darkTheme
        if (theme === 'happy') return happyTheme
        return lightTheme
    }, [theme])

    return (
        <div className="h-full w-full rounded-[20px] overflow-hidden shadow-sm">
            <AgGridReact
                theme={currentTheme}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows
                rowSelection={{ mode: 'multiRow' }}
                singleClickEdit
                stopEditingWhenCellsLoseFocus
                onGridReady={onGridReady}
                onCellValueChanged={onCellValueChanged}
                enableCellTextSelection
            />
        </div>
    )
}
