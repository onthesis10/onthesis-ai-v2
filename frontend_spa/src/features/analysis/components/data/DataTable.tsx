import React from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    getSortedRowModel,
    type SortingState,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { ArrowUpDown } from 'lucide-react'

interface DataTableProps {
    data: any[]
    columns: any[]
}

export function DataTable({ data, columns }: DataTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    })

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="overflow-auto max-h-[70vh]">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 z-10 backdrop-blur-md">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="px-4 py-3 font-semibold border-b border-r last:border-r-0 min-w-[150px]">
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 cursor-pointer select-none hover:text-primary transition-colors",
                                                    header.column.getCanSort() && "cursor-pointer"
                                                )}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {{
                                                    asc: <ArrowUpDown className="w-3 h-3 rotate-180" />,
                                                    desc: <ArrowUpDown className="w-3 h-3" />,
                                                }[header.column.getIsSorted() as string] ?? (
                                                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                                    )}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="bg-card hover:bg-secondary/30 transition-colors group">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="px-4 py-2 border-r last:border-r-0 truncate max-w-[200px] border-border/50">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-2 text-xs text-muted-foreground border-t bg-secondary/20">
                {data.length} rows loaded.
            </div>
        </div>
    )
}
