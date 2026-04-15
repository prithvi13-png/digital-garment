"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import {
  createCRMCustomField,
  createCRMOption,
  createCRMPipeline,
  createCRMPipelineStage,
  createCRMTag,
  listCRMCustomFields,
  listCRMOptions,
  listCRMPipelineStages,
  listCRMPipelines,
  listCRMTags,
} from "@/services/crm";
import { CRMModuleKey } from "@/types/api";

const MODULE_OPTIONS: CRMModuleKey[] = ["lead", "opportunity", "task", "order", "support_ticket", "approval", "collection", "procurement"];

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CRMSettingsPage() {
  const queryClient = useQueryClient();
  const [optionCategory, setOptionCategory] = useState("lead_source");
  const [optionLabel, setOptionLabel] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#2563eb");
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineModule, setPipelineModule] = useState<CRMModuleKey>("lead");
  const [stagePipeline, setStagePipeline] = useState("");
  const [stageName, setStageName] = useState("");
  const [stageProbability, setStageProbability] = useState("0");
  const [customModule, setCustomModule] = useState<CRMModuleKey>("lead");
  const [customEntity, setCustomEntity] = useState("lead");
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState("text");

  const optionsQuery = useQuery({
    queryKey: ["crm-settings-options"],
    queryFn: () => listCRMOptions({ page: 1, ordering: "category,sort_order" }),
  });

  const tagsQuery = useQuery({
    queryKey: ["crm-settings-tags"],
    queryFn: () => listCRMTags({ page: 1, ordering: "name" }),
  });

  const pipelinesQuery = useQuery({
    queryKey: ["crm-settings-pipelines"],
    queryFn: () => listCRMPipelines({ page: 1, ordering: "module_key,sort_order" }),
  });

  const stagesQuery = useQuery({
    queryKey: ["crm-settings-stages"],
    queryFn: () => listCRMPipelineStages({ page: 1, ordering: "pipeline,sort_order" }),
  });

  const customFieldsQuery = useQuery({
    queryKey: ["crm-settings-custom-fields"],
    queryFn: () => listCRMCustomFields({ page: 1, ordering: "module_key,entity_key,sort_order" }),
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-settings-options"] });
    queryClient.invalidateQueries({ queryKey: ["crm-settings-tags"] });
    queryClient.invalidateQueries({ queryKey: ["crm-settings-pipelines"] });
    queryClient.invalidateQueries({ queryKey: ["crm-settings-stages"] });
    queryClient.invalidateQueries({ queryKey: ["crm-settings-custom-fields"] });
    queryClient.invalidateQueries({ queryKey: ["crm-filter-metadata"] });
  };

  const createOptionMutation = useMutation({
    mutationFn: createCRMOption,
    onSuccess: () => {
      toast.success("Option added");
      setOptionLabel("");
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create option"),
  });

  const createTagMutation = useMutation({
    mutationFn: createCRMTag,
    onSuccess: () => {
      toast.success("Tag added");
      setTagName("");
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create tag"),
  });

  const createPipelineMutation = useMutation({
    mutationFn: createCRMPipeline,
    onSuccess: () => {
      toast.success("Pipeline created");
      setPipelineName("");
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create pipeline"),
  });

  const createStageMutation = useMutation({
    mutationFn: createCRMPipelineStage,
    onSuccess: () => {
      toast.success("Stage created");
      setStageName("");
      setStageProbability("0");
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create stage"),
  });

  const createCustomFieldMutation = useMutation({
    mutationFn: createCRMCustomField,
    onSuccess: () => {
      toast.success("Custom field created");
      setCustomLabel("");
      refreshAll();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create custom field"),
  });

  const pipelines = useMemo(() => pipelinesQuery.data?.results || [], [pipelinesQuery.data]);
  const stages = stagesQuery.data?.results || [];

  const pipelinesForSelectedModule = useMemo(
    () => pipelines.filter((pipeline) => pipeline.module_key === pipelineModule),
    [pipelines, pipelineModule],
  );

  const loading =
    optionsQuery.isLoading ||
    tagsQuery.isLoading ||
    pipelinesQuery.isLoading ||
    stagesQuery.isLoading ||
    customFieldsQuery.isLoading;

  const hasError =
    optionsQuery.isError || tagsQuery.isError || pipelinesQuery.isError || stagesQuery.isError || customFieldsQuery.isError;

  if (loading) {
    return (
      <div className="space-y-3">
        <Card>
          <Skeleton className="h-28 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-72 w-full" />
        </Card>
      </div>
    );
  }

  if (hasError) {
    return <ErrorState message="Failed to load CRM settings." onRetry={refreshAll} />;
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Settings</p>
        <h2 className="text-2xl font-bold text-slate-900">Configuration Studio</h2>
        <p className="text-sm text-slate-500">Manage stages, option masters, tags, and custom fields without code changes.</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Option Masters</h3>
          <div className="mb-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
            <Select value={optionCategory} onChange={(e) => setOptionCategory(e.target.value)}>
              <option value="lead_source">Lead Source</option>
              <option value="lead_status">Lead Status</option>
              <option value="priority">Priority</option>
              <option value="loss_reason">Loss Reason</option>
              <option value="win_reason">Win Reason</option>
              <option value="activity_type">Activity Type</option>
              <option value="task_status">Task Status</option>
            </Select>
            <Input value={optionLabel} onChange={(e) => setOptionLabel(e.target.value)} placeholder="Label" />
            <Button
              type="button"
              onClick={() => {
                if (!optionLabel.trim()) {
                  toast.error("Option label is required");
                  return;
                }
                createOptionMutation.mutate({
                  category: optionCategory,
                  key: toSlug(optionLabel),
                  label: optionLabel,
                });
              }}
              disabled={createOptionMutation.isPending}
            >
              Add
            </Button>
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Category</th>
                <th>Key</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              {(optionsQuery.data?.results || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.category}</td>
                  <td>{item.key}</td>
                  <td>{item.label}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Tags</h3>
          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_150px_auto]">
            <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Tag name" />
            <Input value={tagColor} onChange={(e) => setTagColor(e.target.value)} type="color" />
            <Button
              type="button"
              onClick={() => {
                if (!tagName.trim()) {
                  toast.error("Tag name is required");
                  return;
                }
                createTagMutation.mutate({
                  name: tagName,
                  slug: toSlug(tagName),
                  color: tagColor,
                });
              }}
              disabled={createTagMutation.isPending}
            >
              Add
            </Button>
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Color</th>
              </tr>
            </thead>
            <tbody>
              {(tagsQuery.data?.results || []).map((tag) => (
                <tr key={tag.id}>
                  <td>{tag.name}</td>
                  <td>{tag.slug}</td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.color}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Pipelines & Stages</h3>

          <div className="mb-2 grid gap-2 md:grid-cols-[180px_1fr_auto]">
            <Select value={pipelineModule} onChange={(e) => setPipelineModule(e.target.value as CRMModuleKey)}>
              {MODULE_OPTIONS.map((moduleKey) => (
                <option key={moduleKey} value={moduleKey}>
                  {moduleKey}
                </option>
              ))}
            </Select>
            <Input value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} placeholder="Pipeline name" />
            <Button
              type="button"
              onClick={() => {
                if (!pipelineName.trim()) {
                  toast.error("Pipeline name is required");
                  return;
                }
                createPipelineMutation.mutate({
                  module_key: pipelineModule,
                  name: pipelineName,
                  is_active: true,
                });
              }}
              disabled={createPipelineMutation.isPending}
            >
              Add Pipeline
            </Button>
          </div>

          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_1fr_140px_auto]">
            <Select value={stagePipeline} onChange={(e) => setStagePipeline(e.target.value)}>
              <option value="">Select pipeline</option>
              {pipelinesForSelectedModule.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
            <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Stage name" />
            <Input type="number" value={stageProbability} onChange={(e) => setStageProbability(e.target.value)} placeholder="Probability" />
            <Button
              type="button"
              onClick={() => {
                if (!stagePipeline || !stageName.trim()) {
                  toast.error("Pipeline and stage name are required");
                  return;
                }
                createStageMutation.mutate({
                  pipeline: Number(stagePipeline),
                  key: toSlug(stageName),
                  name: stageName,
                  probability: Number(stageProbability || 0),
                  is_active: true,
                });
              }}
              disabled={createStageMutation.isPending}
            >
              Add Stage
            </Button>
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>Stage</th>
                <th>Probability</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.id}>
                  <td>{pipelines.find((item) => item.id === stage.pipeline)?.name || "-"}</td>
                  <td>{stage.name}</td>
                  <td>{stage.probability}%</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Custom Fields</h3>
          <div className="mb-3 grid gap-2 md:grid-cols-[140px_140px_1fr_140px_auto]">
            <Select value={customModule} onChange={(e) => setCustomModule(e.target.value as CRMModuleKey)}>
              {MODULE_OPTIONS.map((moduleKey) => (
                <option key={moduleKey} value={moduleKey}>
                  {moduleKey}
                </option>
              ))}
            </Select>
            <Input value={customEntity} onChange={(e) => setCustomEntity(e.target.value)} placeholder="Entity key" />
            <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Field label" />
            <Select value={customType} onChange={(e) => setCustomType(e.target.value)}>
              <option value="text">text</option>
              <option value="textarea">textarea</option>
              <option value="number">number</option>
              <option value="date">date</option>
              <option value="datetime">datetime</option>
              <option value="select">select</option>
              <option value="multiselect">multiselect</option>
              <option value="checkbox">checkbox</option>
              <option value="email">email</option>
              <option value="phone">phone</option>
            </Select>
            <Button
              type="button"
              onClick={() => {
                if (!customEntity.trim() || !customLabel.trim()) {
                  toast.error("Entity and label are required");
                  return;
                }
                createCustomFieldMutation.mutate({
                  module_key: customModule,
                  entity_key: customEntity,
                  field_key: toSlug(customLabel),
                  label: customLabel,
                  field_type: customType,
                  is_active: true,
                });
              }}
              disabled={createCustomFieldMutation.isPending}
            >
              Add
            </Button>
          </div>

          <DataTable>
            <thead>
              <tr>
                <th>Module</th>
                <th>Entity</th>
                <th>Field</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {(customFieldsQuery.data?.results || []).map((field) => (
                <tr key={field.id}>
                  <td>{field.module_key}</td>
                  <td>{field.entity_key}</td>
                  <td>{field.label}</td>
                  <td>{field.field_type}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      </div>
    </div>
  );
}
