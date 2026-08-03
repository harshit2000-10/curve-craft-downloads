import { useState } from "react";
import MobileUploadScreen from "@/components/mobile/MobileUploadScreen";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileTabBar, { type MobileTab } from "@/components/mobile/MobileTabBar";
import MobileChartTab from "@/components/mobile/MobileChartTab";
import MobileDataTab from "@/components/mobile/MobileDataTab";
import MobileCleanTab from "@/components/mobile/MobileCleanTab";
import MobileStyleTab from "@/components/mobile/MobileStyleTab";
import MobileExportTab from "@/components/mobile/MobileExportTab";
import ChartArea from "@/components/ChartArea";
import type { AppState, AppTheme } from "@/types";

interface Props {
  appState: AppState | null;
  theme: AppTheme;
  onFile: (file: File) => void;
  onSample: () => void;
  onCreateData: (data: Record<string, unknown>[]) => void;
  onToggleTheme: () => void;
  onOpenProject: () => void;
  onReset: () => void;
  onUndo: () => void;
  onChange: (patch: Partial<AppState>) => void;
  onAddColumn: (name: string, expr: string) => void;
  onDeleteColumn: (col: string) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onFillBlanks: (col: string) => void;
  onEditCell: (rowIndex: number, col: string, rawValue: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteRows: (rowIndices: number[]) => void;
  onExport: () => void;
  onCopyChart: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
}

/** Mobile-native shell (<768px) — bottom tab bar + per-tab chart-visibility
 * policy, entirely separate from the desktop drawer (Sidebar + ChartArea
 * docked side by side). Chart tab gets the full-viewport chart; Style and
 * Export dock a 216px preview strip above their controls (per the mockup);
 * Data and Clean hide the chart entirely. */
export default function MobileApp({
  appState, theme, onFile, onSample, onCreateData, onToggleTheme, onOpenProject, onReset, onUndo, onChange,
  onAddColumn, onDeleteColumn, onRenameColumn, onFillBlanks, onEditCell, onDeleteRow, onDeleteRows,
  onExport, onCopyChart, onExportPdf, onExportCsv,
}: Props) {
  const [tab, setTab] = useState<MobileTab>("chart");

  if (!appState) {
    return (
      <MobileUploadScreen
        theme={theme}
        onFile={onFile}
        onSample={onSample}
        onCreateData={onCreateData}
        onToggleTheme={onToggleTheme}
        onOpenProject={onOpenProject}
      />
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg)" }}>
      <MobileTopBar
        fname={appState.fname}
        theme={theme}
        canUndo={appState.editHistory.length > 0}
        onBack={onReset}
        onUndo={onUndo}
        onToggleTheme={onToggleTheme}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "chart" && <MobileChartTab state={appState} theme={theme} onChange={onChange} />}
        {tab === "data" && (
          <MobileDataTab state={appState} theme={theme} onChange={onChange} onAddColumn={onAddColumn} />
        )}
        {tab === "clean" && (
          <MobileCleanTab
            state={appState}
            theme={theme}
            onDeleteColumn={onDeleteColumn}
            onRenameColumn={onRenameColumn}
            onFillBlanks={onFillBlanks}
            onEditCell={onEditCell}
            onDeleteRow={onDeleteRow}
            onDeleteRows={onDeleteRows}
          />
        )}
        {(tab === "style" || tab === "export") && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-[216px] flex-shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
              <ChartArea state={appState} theme={theme} panelWidth={0} onChange={onChange} compact />
            </div>
            {tab === "style" ? (
              <MobileStyleTab state={appState} theme={theme} onChange={onChange} />
            ) : (
              <MobileExportTab
                state={appState} theme={theme} onChange={onChange}
                onExport={onExport} onCopyChart={onCopyChart}
                onExportPdf={onExportPdf} onExportCsv={onExportCsv}
              />
            )}
          </div>
        )}
      </div>

      <MobileTabBar active={tab} onChange={setTab} />
    </div>
  );
}
