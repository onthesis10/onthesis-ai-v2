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
    RowSelectionModule, // Added
    TextFilterModule, // Added
    NumberFilterModule, // Added
    DateFilterModule, // Added
    CustomFilterModule, // Added
    CellStyleModule, // Added
    EventApiModule, // Added
    themeQuartz,
    iconSetQuartzLight
} from 'ag-grid-community'

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ValidationModule,
    TextEditorModule,
    NumberEditorModule,
    SelectEditorModule,
    RowSelectionModule, // Added
    TextFilterModule, // Added
    NumberFilterModule, // Added
    DateFilterModule, // Added
    CustomFilterModule, // Added
    CellStyleModule, // Added
    EventApiModule // Added
]);

// Light Mode Theme
const lightTheme = themeQuartz
    .withPart(iconSetQuartzLight)
    .withParams({
        backgroundColor: "#ffffff",
        browserColorScheme: "light",
        columnBorder: false,
        fontFamily: "'Inter', Arial, sans-serif",
        foregroundColor: "rgb(46, 55, 66)",
        headerBackgroundColor: "#F9FAFB",
        headerFontSize: 13,
        headerFontWeight: 600,
        headerTextColor: "#6B7280",
        oddRowBackgroundColor: "#F9FAFB",
        rowBorder: false,
        sidePanelBorder: false,
        spacing: 8,
        wrapperBorder: false,
        wrapperBorderRadius: 20, /* Rounded like Mac OS windows */
        cellHorizontalPaddingScale: 1.2,
        rowVerticalPaddingScale: 1.2,
    });

// Dark Mode Theme (Ocean Blue / Navy Dark Match)
const darkTheme = themeQuartz
    .withParams({
        accentColor: "#0A84FF", // macOS Blue
        backgroundColor: "#0F172A", // Slate 900 (Matches --background: 222 47% 11%)
        borderColor: "rgba(255, 255, 255, 0.08)", // Subtle glass border
        borderRadius: 12,
        browserColorScheme: "dark",
        cellHorizontalPaddingScale: 1.2,
        chromeBackgroundColor: {
            ref: "backgroundColor"
        },
        columnBorder: false,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        foregroundColor: "#E2E8F0", // Slate 200
        headerBackgroundColor: "#1E293B", // Slate 800 (Slightly lighter than bg)
        headerFontSize: 13,
        headerFontWeight: 600,
        headerTextColor: "#F8FAFC", // Slate 50
        headerVerticalPaddingScale: 1.1,
        iconSize: 16,
        rowBorder: false, /* REMOVED ROW BORDERS for clean look */
        rowVerticalPaddingScale: 1.3,
        sidePanelBorder: false,
        spacing: 8,
        wrapperBorder: false,
        wrapperBorderRadius: 20, /* Rounded */
        oddRowBackgroundColor: "rgba(255, 255, 255, 0.03)", // Very subtle stripe
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
    const [isDarkMode, setIsDarkMode] = useState(false)

    // Detect dark mode from document
    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'))
        }

        checkDarkMode()

        // Observe changes to the html class
        const observer = new MutationObserver(checkDarkMode)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        return () => observer.disconnect()
    }, [])

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

    const currentTheme = isDarkMode ? darkTheme : lightTheme

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
