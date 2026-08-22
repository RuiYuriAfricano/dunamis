"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, Gift, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Stepper } from "@/components/registration/stepper";
import { FileUpload } from "@/components/registration/file-upload";
import { apiFetch, ApiError } from "@/lib/api";
import { EVENT_PHONE, PAYMENT_AMOUNT_MEMBER, PAYMENT_AMOUNT_VISITOR } from "@/lib/event";
import { formatAngolaPhone, stripPhoneMask } from "@/lib/masks";
import type { ParticipantConfirmation, TentTypeSummary, TransportStopSummary } from "@dunamis/types";

const TIBL_NAME = "Terceira Igreja Baptista de Luanda";

const schema = z
  .object({
    isMemberTibl: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    church: z.string().optional(),
    firstTime: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    baptized: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    fullName: z.string().min(3, "Indique o nome completo."),
    gender: z.enum(["MALE", "FEMALE"], { message: "Selecione o sexo." }),
    birthDate: z
      .string()
      .min(1, "Indique a data de nascimento.")
      .refine((v) => {
        const date = new Date(v);
        if (Number.isNaN(date.getTime())) return false;
        const now = new Date();
        if (date > now) return false;
        let age = now.getFullYear() - date.getFullYear();
        const monthDiff = now.getMonth() - date.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age -= 1;
        return age >= 13 && age <= 120;
      }, "A idade mínima para participar é 13 anos."),
    phone: z.string().refine((v) => stripPhoneMask(v).length === 9, "Indique um número de telefone válido (9 dígitos)."),
    whatsapp: z
      .string()
      .refine((v) => stripPhoneMask(v).length === 9, "Indique um número de WhatsApp válido (9 dígitos)."),
    email: z.email("Indique um email válido."),
    allergicTo: z.string().optional(),
    maritalStatus: z.enum(["SINGLE", "MARRIED"], { message: "Selecione uma opção." }),
    bringingChildren: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    numberOfChildren: z.string().optional(),
    transportRequired: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    transportStopId: z.string().optional(),
    ownTransportType: z.enum(["INDIVIDUAL", "TAXI"]).optional(),
    carSeats: z.string().optional(),
    carRouteStops: z.string().optional(),
    tentRequired: z.boolean(),
    mattressRequired: z.boolean(),
    tentsCanProvide: z.string().optional(),
    mattressesCanProvide: z.string().optional(),
    wantsToBuyTent: z.enum(["true", "false"]).optional(),
    tentPurchaseTypeId: z.string().optional(),
    tentPurchaseQuantity: z.string().optional(),
    isSponsored: z.enum(["true", "false"], { message: "Selecione uma opção." }),
  })
  .refine((data) => data.transportRequired === "false" || !!data.transportStopId, {
    message: "Selecione a paragem de transporte.",
    path: ["transportStopId"],
  })
  .refine((data) => data.isMemberTibl === "true" || (data.church?.trim().length ?? 0) >= 2, {
    message: "Indique a sua igreja.",
    path: ["church"],
  });

type FormValues = z.infer<typeof schema>;

const STEPS: { label: string; fields: Path<FormValues>[] }[] = [
  { label: "Participação", fields: ["isMemberTibl", "church", "firstTime", "baptized"] },
  {
    label: "Dados pessoais",
    fields: [
      "fullName",
      "gender",
      "birthDate",
      "phone",
      "whatsapp",
      "email",
      "allergicTo",
      "maritalStatus",
      "bringingChildren",
      "numberOfChildren",
    ],
  },
  { label: "Transporte", fields: ["transportRequired", "transportStopId", "ownTransportType", "carSeats", "carRouteStops"] },
  {
    label: "Alojamento",
    fields: [
      "tentRequired",
      "mattressRequired",
      "tentsCanProvide",
      "mattressesCanProvide",
      "wantsToBuyTent",
      "tentPurchaseTypeId",
      "tentPurchaseQuantity",
    ],
  },
  { label: "Pagamento", fields: ["isSponsored"] },
];

export function RegistrationForm({
  stops,
  tentTypes,
}: {
  stops: TransportStopSummary[];
  tentTypes: TentTypeSummary[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
  const isLastStep = step === STEPS.length - 1;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isMemberTibl: "" as unknown as FormValues["isMemberTibl"],
      church: "",
      firstTime: "" as unknown as FormValues["firstTime"],
      baptized: "" as unknown as FormValues["baptized"],
      gender: "" as unknown as FormValues["gender"],
      allergicTo: "",
      maritalStatus: "" as unknown as FormValues["maritalStatus"],
      bringingChildren: "false",
      numberOfChildren: "",
      transportStopId: "",
      ownTransportType: "" as unknown as FormValues["ownTransportType"],
      carSeats: "",
      carRouteStops: "",
      tentRequired: false,
      mattressRequired: false,
      tentsCanProvide: "0",
      mattressesCanProvide: "0",
      wantsToBuyTent: "false",
      tentPurchaseTypeId: "",
      tentPurchaseQuantity: "1",
      transportRequired: "false",
      isSponsored: "false",
    },
  });

  const transportRequired = watch("transportRequired");
  const isMemberTibl = watch("isMemberTibl");
  const isSponsored = watch("isSponsored");
  const bringingChildren = watch("bringingChildren");
  const ownTransportType = watch("ownTransportType");
  const tentRequired = watch("tentRequired");
  const mattressRequired = watch("mattressRequired");
  const wantsToBuyTent = watch("wantsToBuyTent");
  const tentPurchaseTypeId = watch("tentPurchaseTypeId");
  const tentPurchaseQuantity = watch("tentPurchaseQuantity");

  useEffect(() => {
    if (isMemberTibl === "true") {
      setValue("church", TIBL_NAME);
    } else if (isMemberTibl === "false") {
      setValue("church", "");
    }
  }, [isMemberTibl, setValue]);

  const selectedTentType = tentTypes.find((t) => t.id === tentPurchaseTypeId);
  const tentPurchaseCost =
    wantsToBuyTent === "true" && selectedTentType
      ? selectedTentType.price * (parseInt(tentPurchaseQuantity || "0", 10) || 0)
      : 0;
  const baseAmount = isMemberTibl === "true" ? PAYMENT_AMOUNT_MEMBER : PAYMENT_AMOUNT_VISITOR;
  const totalAmount = baseAmount + tentPurchaseCost;

  async function goNext() {
    let valid = await trigger(STEPS[step].fields);

    // Cross-field "required if" checks are done explicitly rather than
    // relying only on the zod object refine — trigger()'s partial-field
    // validation doesn't reliably surface those on this codebase/RHF setup
    // (confirmed with the equivalent church-required case).
    if (valid && step === 0 && getValues("isMemberTibl") === "false") {
      const church = getValues("church");
      if (!church || church.trim().length < 2) {
        setError("church", { type: "manual", message: "Indique a sua igreja." });
        valid = false;
      }
    }

    if (valid && step === 1 && getValues("bringingChildren") === "true") {
      const n = parseInt(getValues("numberOfChildren") || "", 10);
      if (!n || n < 1) {
        setError("numberOfChildren", { type: "manual", message: "Indique quantos filhos." });
        valid = false;
      }
    }

    if (valid && step === 2 && getValues("transportRequired") === "false") {
      const type = getValues("ownTransportType");
      if (!type) {
        setError("ownTransportType", { type: "manual", message: "Selecione uma opção." });
        valid = false;
      } else if (type === "INDIVIDUAL") {
        const seats = parseInt(getValues("carSeats") || "", 10);
        if (!seats || seats < 1) {
          setError("carSeats", { type: "manual", message: "Indique quantos lugares tem o carro." });
          valid = false;
        }
        if (!getValues("carRouteStops")?.trim()) {
          setError("carRouteStops", { type: "manual", message: "Indique as paragens do trajeto." });
          valid = false;
        }
      }
    }

    if (valid && step === 3) {
      if (!getValues("tentRequired")) {
        const n = getValues("tentsCanProvide");
        if (n === undefined || n === "" || parseInt(n, 10) < 0) {
          setError("tentsCanProvide", { type: "manual", message: "Indique um número (0 se não puder)." });
          valid = false;
        }
      } else {
        const wants = getValues("wantsToBuyTent");
        if (!wants) {
          setError("wantsToBuyTent", { type: "manual", message: "Selecione uma opção." });
          valid = false;
        } else if (wants === "true" && tentTypes.length > 0) {
          if (!getValues("tentPurchaseTypeId")) {
            setError("tentPurchaseTypeId", { type: "manual", message: "Selecione o tipo de tenda." });
            valid = false;
          }
          const qty = parseInt(getValues("tentPurchaseQuantity") || "", 10);
          if (!qty || qty < 1) {
            setError("tentPurchaseQuantity", { type: "manual", message: "Indique quantas tendas." });
            valid = false;
          }
        }
      }

      if (!getValues("mattressRequired")) {
        const n = getValues("mattressesCanProvide");
        if (n === undefined || n === "" || parseInt(n, 10) < 0) {
          setError("mattressesCanProvide", { type: "manual", message: "Indique um número (0 se não puder)." });
          valid = false;
        }
      }
    }

    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: FormValues) {
    const sponsored = values.isSponsored === "true";
    if (!sponsored && !paymentProof) {
      setPaymentProofError("Carregue o comprovativo de pagamento.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("fullName", values.fullName);
      formData.set("gender", values.gender);
      formData.set("birthDate", values.birthDate);
      formData.set("phone", stripPhoneMask(values.phone));
      formData.set("whatsapp", stripPhoneMask(values.whatsapp));
      formData.set("email", values.email);
      formData.set("church", values.isMemberTibl === "true" ? TIBL_NAME : (values.church ?? ""));
      formData.set("isMemberTibl", String(values.isMemberTibl === "true"));
      formData.set("baptized", String(values.baptized === "true"));
      formData.set("allergicTo", values.allergicTo?.trim() ?? "");
      formData.set("firstTime", String(values.firstTime === "true"));
      formData.set("maritalStatus", values.maritalStatus);
      const hasChildren = values.bringingChildren === "true";
      formData.set("bringingChildren", String(hasChildren));
      if (hasChildren) formData.set("numberOfChildren", values.numberOfChildren ?? "0");
      formData.set("transportRequired", String(values.transportRequired === "true"));
      if (values.transportRequired === "true" && values.transportStopId) {
        formData.set("transportStopId", values.transportStopId);
      } else if (values.transportRequired === "false" && values.ownTransportType) {
        formData.set("ownTransportType", values.ownTransportType);
        if (values.ownTransportType === "INDIVIDUAL") {
          formData.set("carSeats", values.carSeats ?? "");
          formData.set("carRouteStops", values.carRouteStops ?? "");
        }
      }
      formData.set("tentRequired", String(values.tentRequired));
      formData.set("mattressRequired", String(values.mattressRequired));
      if (!values.tentRequired) formData.set("tentsCanProvide", values.tentsCanProvide ?? "0");
      if (!values.mattressRequired) formData.set("mattressesCanProvide", values.mattressesCanProvide ?? "0");
      const buyingTent = values.tentRequired && values.wantsToBuyTent === "true" && !!values.tentPurchaseTypeId;
      formData.set("wantsToBuyTent", String(buyingTent));
      if (buyingTent) {
        formData.set("tentPurchaseTypeId", values.tentPurchaseTypeId!);
        formData.set("tentPurchaseQuantity", values.tentPurchaseQuantity ?? "1");
      }
      formData.set("isSponsored", String(sponsored));
      if (!sponsored && paymentProof) {
        formData.set("paymentProof", paymentProof);
      }

      const confirmation = await apiFetch<ParticipantConfirmation>("/participants", {
        method: "POST",
        body: formData,
      });

      sessionStorage.setItem("dunamis-confirmation", JSON.stringify(confirmation));
      router.push("/inscricao/sucesso");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Não foi possível concluir a inscrição.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-4 gap-0 overflow-hidden py-0 duration-700">
      <CardHeader className="border-b bg-muted/30 px-6 py-6 sm:px-8">
        <Stepper steps={STEPS} current={step} />
      </CardHeader>
      <CardContent className="px-6 py-8 sm:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isLastStep) {
              void handleSubmit(onSubmit)();
            } else {
              void goNext();
            }
          }}
          className="space-y-6"
        >
          {step === 0 && (
            <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-300">
              <div className="space-y-2">
                <Label>É membro da Terceira Igreja Baptista de Luanda?</Label>
                <Controller
                  control={control}
                  name="isMemberTibl"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="true" /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="false" /> Não
                      </label>
                    </RadioGroup>
                  )}
                />
                {errors.isMemberTibl && <p className="text-sm text-destructive">{errors.isMemberTibl.message}</p>}
              </div>

              {isMemberTibl === "false" && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
                  <Label htmlFor="church">Qual a sua igreja?</Label>
                  <Input id="church" placeholder="Nome da sua igreja local" {...register("church")} />
                  {errors.church && <p className="text-sm text-destructive">{errors.church.message}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>É a primeira vez que participa no DUNAMIS?</Label>
                <Controller
                  control={control}
                  name="firstTime"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="true" /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="false" /> Não
                      </label>
                    </RadioGroup>
                  )}
                />
                {errors.firstTime && <p className="text-sm text-destructive">{errors.firstTime.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>É baptizado(a)?</Label>
                <Controller
                  control={control}
                  name="baptized"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="true" /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="false" /> Não
                      </label>
                    </RadioGroup>
                  )}
                />
                {errors.baptized && <p className="text-sm text-destructive">{errors.baptized.message}</p>}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-300">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" {...register("fullName")} />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="MALE" /> Masculino
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="FEMALE" /> Feminino
                        </label>
                      </RadioGroup>
                    )}
                  />
                  {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                    {...register("birthDate")}
                  />
                  {errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <Input
                        id="phone"
                        inputMode="numeric"
                        placeholder="9XX XXX XXX"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(formatAngolaPhone(e.target.value))}
                      />
                    )}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Controller
                    control={control}
                    name="whatsapp"
                    render={({ field }) => (
                      <Input
                        id="whatsapp"
                        inputMode="numeric"
                        placeholder="9XX XXX XXX"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(formatAngolaPhone(e.target.value))}
                      />
                    )}
                  />
                  {errors.whatsapp && <p className="text-sm text-destructive">{errors.whatsapp.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" inputMode="email" autoComplete="email" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergicTo">É alérgico(a) a alguma coisa?</Label>
                <Input
                  id="allergicTo"
                  placeholder="Ex.: amendoim, penicilina... (deixe em branco se não for alérgico)"
                  {...register("allergicTo")}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado civil</Label>
                <Controller
                  control={control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="SINGLE" /> Solteiro(a)
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="MARRIED" /> Casado(a)
                      </label>
                    </RadioGroup>
                  )}
                />
                {errors.maritalStatus && <p className="text-sm text-destructive">{errors.maritalStatus.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Vai levar filho(s)?</Label>
                <Controller
                  control={control}
                  name="bringingChildren"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="true" /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="false" /> Não
                      </label>
                    </RadioGroup>
                  )}
                />
              </div>

              {bringingChildren === "true" && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
                  <Label htmlFor="numberOfChildren">Quantos filhos?</Label>
                  <Input
                    id="numberOfChildren"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    {...register("numberOfChildren")}
                  />
                  {errors.numberOfChildren && (
                    <p className="text-sm text-destructive">{errors.numberOfChildren.message}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-300">
              <div className="space-y-2">
                <Label>Pretende utilizar o transporte disponibilizado pela organização?</Label>
                <Controller
                  control={control}
                  name="transportRequired"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="true" /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="false" /> Não
                      </label>
                    </RadioGroup>
                  )}
                />
              </div>

              {transportRequired === "true" && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
                  <Label>Paragem</Label>
                  <Controller
                    control={control}
                    name="transportStopId"
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(v ?? "")}
                        value={field.value || null}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a paragem">
                            {(value: string | null) =>
                              stops.find((s) => s.id === value)?.name ?? "Selecione a paragem"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {stops.map((stop) => (
                            <SelectItem key={stop.id} value={stop.id}>
                              {stop.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.transportStopId && (
                    <p className="text-sm text-destructive">{errors.transportStopId.message}</p>
                  )}
                </div>
              )}

              {transportRequired === "false" && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-5 duration-300">
                  <div className="space-y-2">
                    <Label>Tem transporte individual ou vai de táxi?</Label>
                    <Controller
                      control={control}
                      name="ownTransportType"
                      render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="INDIVIDUAL" /> Transporte individual
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="TAXI" /> Táxi
                          </label>
                        </RadioGroup>
                      )}
                    />
                    {errors.ownTransportType && (
                      <p className="text-sm text-destructive">{errors.ownTransportType.message}</p>
                    )}
                  </div>

                  {ownTransportType === "INDIVIDUAL" && (
                    <div className="animate-in fade-in slide-in-from-top-1 space-y-4 duration-300">
                      <div className="space-y-2">
                        <Label htmlFor="carSeats">Quantos lugares tem o carro?</Label>
                        <Input id="carSeats" type="number" min={1} inputMode="numeric" {...register("carSeats")} />
                        {errors.carSeats && <p className="text-sm text-destructive">{errors.carSeats.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carRouteStops">Que paragens vai passar até ao Kikuxi?</Label>
                        <Input
                          id="carRouteStops"
                          placeholder="Ex.: Nova Vida, Viana, Zango..."
                          {...register("carRouteStops")}
                        />
                        {errors.carRouteStops && (
                          <p className="text-sm text-destructive">{errors.carRouteStops.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-300">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="tentRequired"
                  render={({ field }) => (
                    <Checkbox id="tentRequired" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <Label htmlFor="tentRequired" className="font-normal">
                  Preciso de tenda
                </Label>
              </div>

              {!tentRequired && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-2 pl-6 duration-300">
                  <Label htmlFor="tentsCanProvide">
                    Já tem tenda própria — pode disponibilizar tendas para o acampamento? Quantas?
                  </Label>
                  <Input
                    id="tentsCanProvide"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    {...register("tentsCanProvide")}
                  />
                  {errors.tentsCanProvide && (
                    <p className="text-sm text-destructive">{errors.tentsCanProvide.message}</p>
                  )}
                </div>
              )}

              {tentRequired && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-4 pl-6 duration-300">
                  <div className="space-y-2">
                    <Label>Pode comprar uma tenda?</Label>
                    <Controller
                      control={control}
                      name="wantsToBuyTent"
                      render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="true" /> Sim
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="false" /> Não
                          </label>
                        </RadioGroup>
                      )}
                    />
                    {errors.wantsToBuyTent && (
                      <p className="text-sm text-destructive">{errors.wantsToBuyTent.message}</p>
                    )}
                  </div>

                  {wantsToBuyTent === "true" && (
                    <div className="animate-in fade-in slide-in-from-top-1 space-y-4 duration-300">
                      {tentTypes.length === 0 ? (
                        <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                          <Tent className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          De momento não há tendas disponíveis para compra. A organização entrará em contacto.
                        </p>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Tipo de tenda</Label>
                            <Controller
                              control={control}
                              name="tentPurchaseTypeId"
                              render={({ field }) => (
                                <Select onValueChange={(v) => field.onChange(v ?? "")} value={field.value || null}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione o tipo de tenda">
                                      {(value: string | null) => {
                                        const t = tentTypes.find((tt) => tt.id === value);
                                        return t ? `${t.name} — ${t.price.toLocaleString("pt-PT")} Kz` : "Selecione o tipo de tenda";
                                      }}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tentTypes.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.name} — {t.price.toLocaleString("pt-PT")} Kz
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.tentPurchaseTypeId && (
                              <p className="text-sm text-destructive">{errors.tentPurchaseTypeId.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tentPurchaseQuantity">Quantas?</Label>
                            <Input
                              id="tentPurchaseQuantity"
                              type="number"
                              min={1}
                              inputMode="numeric"
                              {...register("tentPurchaseQuantity")}
                            />
                            {errors.tentPurchaseQuantity && (
                              <p className="text-sm text-destructive">{errors.tentPurchaseQuantity.message}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="mattressRequired"
                  render={({ field }) => (
                    <Checkbox id="mattressRequired" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <Label htmlFor="mattressRequired" className="font-normal">
                  Preciso de colchão
                </Label>
              </div>

              {!mattressRequired && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-2 pl-6 duration-300">
                  <Label htmlFor="mattressesCanProvide">
                    Já tem colchão próprio — pode disponibilizar colchões apropriados para o acampamento? Quantos?
                  </Label>
                  <Input
                    id="mattressesCanProvide"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    {...register("mattressesCanProvide")}
                  />
                  {errors.mattressesCanProvide && (
                    <p className="text-sm text-destructive">{errors.mattressesCanProvide.message}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-300">
              <div className="space-y-2">
                <Label>É patrocinado(a) ou bolseiro(a)?</Label>
                <Controller
                  control={control}
                  name="isSponsored"
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="true" /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="false" /> Não
                      </label>
                    </RadioGroup>
                  )}
                />
                {errors.isSponsored && <p className="text-sm text-destructive">{errors.isSponsored.message}</p>}
              </div>

              {isSponsored === "true" ? (
                <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <Gift className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p>
                    Não é necessário carregar comprovativo de pagamento. A sua inscrição como patrocinado(a)/bolseiro(a)
                    será revista pela organização — só depois de aprovada receberá o QR Code de acesso por email.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm text-muted-foreground">Valor da inscrição</p>
                    <p className="text-2xl font-bold text-primary">{totalAmount.toLocaleString("pt-PT")} Kz</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isMemberTibl === "true"
                        ? "Valor para membros da Terceira Igreja Baptista de Luanda."
                        : "Valor para visitantes de outras igrejas."}
                      {tentPurchaseCost > 0 && ` Inclui ${tentPurchaseCost.toLocaleString("pt-PT")} Kz de tenda(s).`}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Efetue o pagamento via <span className="font-medium text-foreground">Multicaixa Express</span>{" "}
                      para o número {EVENT_PHONE} ou por <span className="font-medium text-foreground">transferência
                      bancária (IBAN)</span>, e carregue o comprovativo (captura de ecrã ou PDF) abaixo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Comprovativo de pagamento</Label>
                    <FileUpload
                      value={paymentProof}
                      onChange={(file) => {
                        setPaymentProof(file);
                        if (file) setPaymentProofError(null);
                      }}
                      accept="image/*,application/pdf"
                      error={paymentProofError ?? undefined}
                    />
                  </div>
                </>
              )}

              <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                Ao confirmar a inscrição, declara ter tomado conhecimento das{" "}
                <Link href="/normas" target="_blank" className="font-medium text-primary underline underline-offset-2">
                  normas do DUNAMIS e dos procedimentos de segurança
                </Link>
                .
              </p>
            </section>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1" onClick={goBack} disabled={submitting}>
                Voltar
              </Button>
            )}
            {!isLastStep && (
              <Button type="button" className="flex-1" onClick={goNext}>
                Seguinte
              </Button>
            )}
            {isLastStep && (
              <Button type="submit" className="flex-1 transition-transform active:scale-[0.98]" disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? "A enviar..." : "Confirmar inscrição"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
