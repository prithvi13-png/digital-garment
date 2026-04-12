"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { InspectionStageBadge } from "@/components/status-badges/inspection-stage-badge";
import { SeverityBadge } from "@/components/status-badges/severity-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { getQualityInspection } from "@/services/quality";

export default function QualityInspectionDetailsPage() {
  const params = useParams<{ id: string }>();
  const inspectionId = Number(params.id);

  const inspectionQuery = useQuery({
    queryKey: ["quality-inspection", inspectionId],
    queryFn: () => getQualityInspection(inspectionId),
    enabled: Number.isFinite(inspectionId),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quality Inspection Details</h2>
            <p className="text-sm text-slate-500">View quality metrics and defect breakdown for a single inspection run.</p>
          </div>
          <Link href="/quality-inspections">
            <Button variant="secondary">Back to Inspections</Button>
          </Link>
        </div>
      </Card>

      {inspectionQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : inspectionQuery.isError ? (
        <ErrorState message="Failed to load inspection details." onRetry={inspectionQuery.refetch} />
      ) : inspectionQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <p className="text-xs uppercase text-slate-500">Inspection Date</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(inspectionQuery.data.date)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Order</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{inspectionQuery.data.order_code || `#${inspectionQuery.data.order}`}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Line</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{inspectionQuery.data.line_name || "-"}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Inspector</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{inspectionQuery.data.inspector_name || "-"}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Stage</p>
              <div className="mt-2">
                <InspectionStageBadge stage={inspectionQuery.data.inspection_stage} />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card>
              <p className="text-xs uppercase text-slate-500">Checked</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(inspectionQuery.data.checked_qty)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Passed</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{formatNumber(inspectionQuery.data.passed_qty)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Defective</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{formatNumber(inspectionQuery.data.defective_qty)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Rejected</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{formatNumber(inspectionQuery.data.rejected_qty)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Rework</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{formatNumber(inspectionQuery.data.rework_qty)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Defect / Rejection</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatPercent(inspectionQuery.data.defect_rate)} / {formatPercent(inspectionQuery.data.rejection_rate)}
              </p>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-900">Defect Breakdown</h3>
            {inspectionQuery.data.defects?.length ? (
              <DataTable>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th>Defect Type</th>
                    <th>Code</th>
                    <th>Severity</th>
                    <th>Quantity</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectionQuery.data.defects.map((defect, index) => (
                    <tr key={`${defect.defect_type}-${index}`}>
                      <td className="font-medium text-slate-800">{defect.defect_name || "-"}</td>
                      <td className="text-slate-600">{defect.defect_code || "-"}</td>
                      <td>{defect.severity ? <SeverityBadge severity={defect.severity} /> : "-"}</td>
                      <td className="text-slate-700">{formatNumber(defect.quantity)}</td>
                      <td className="text-slate-600">{defect.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState
                title="No defect rows"
                description="This inspection has no defect line-items attached."
              />
            )}
          </Card>

          <Card>
            <h3 className="mb-2 text-base font-semibold text-slate-900">Additional Notes</h3>
            <p className="text-sm text-slate-600">{inspectionQuery.data.remarks || "No remarks provided."}</p>
            <p className="mt-2 text-xs text-slate-500">Barcode: {inspectionQuery.data.barcode_value || "-"}</p>
          </Card>
        </>
      ) : (
        <EmptyState title="Inspection not found" description="The requested inspection does not exist." />
      )}
    </div>
  );
}
