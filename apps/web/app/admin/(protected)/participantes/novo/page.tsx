"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Tent, UserPlus } from "lucide-react";
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
import { useSession } from "@/lib/use-session";
import { apiFetch, ApiError } from "@/lib/api";
import { EVENT_DATE_RANGE, EVENT_LOCATION } from "@/lib/event";
import { formatAngolaPhone, stripPhoneMask } from "@/lib/masks";
import type { ParticipantSummary, TentTypeSummary, TransportStopSummary } from "@dunamis/types";

const TIBL_NAME = "Terceira Igreja Baptista de Luanda";

const schema = z
  .object({
    isMemberTibl: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    church: z.string().optional(),
    firstTime: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    baptized: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    fullName: z.string().min(3, "Indique o nome completo."),
    gender: z.enum(["MALE", "FEMALE"], { message: "Selecione o sexo." }),
    birthDate: z.string().min(1, "Indique a data de nascimento."),
    phone: z.string().refine((v) => stripPhoneMask(v).length === 9, "Indique um número de telefone válido (9 dígitos)."),
    whatsapp: z.string().refine((v) => stripPhoneMask(v).length === 9, "Indique um número de WhatsApp válido (9 dígitos)."),
    email: z.email("Indique um email válido."),
    allergicTo: z.string().optional(),
    maritalStatus: z.enum(["SINGLE", "MARRIED"], { message: "Selecione uma opção." }),
    bringingChildren: z.enum(["true", "false"]),
    numberOfChildren: z.string().optional(),
    transportRequired: z.enum(["true", "false"], { message: "Selecione uma opção." }),
    transportStopId: z.string().optional(),
    ownTransportType: z.enum(["INDIVIDUAL", "TAXI", ""]).optional(),
    carSeats: z.string().optional(),
    carRouteStops: z.string().optional(),
    tentRequired: z.boolean(),
    mattressRequired: z.boolean(),
    tentsCanProvide: z.string().optional(),
    mattressesCanProvide: z.string().optional(),
    wantsToBuyTent: z.enum(["true", "false"]).optional(),
    tentPurchaseTypeId: z.string().optional(),
    tentPurchaseQuantity: z.string().optional(),
    wantsToBuyMattress: z.enum(["true", "false"]).optional(),
    mattressPurchaseQuantity: z.string().optional(),
    isSponsored: z.enum(["true", "false"]),
    paymentStatus: z.enum(["PENDING", "CONFIRMED", "REJECTED"]),
    paidInHand: z.enum(["true", "false"]).optional(),
    paymentAmountPaid: z.string().optional(),
  })
  .refine((data) => data.transportRequired === "false" || !!data.transportStopId, {
    message: "Selecione a paragem de transporte.",
    path: ["transportStopId"],
  })
  .refine((data) => data.isMemberTibl === "true" || (data.church?.trim().length ?? 0) >= 2, {
    message: "Indique a igreja.",
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
      "wantsToBuyMattress",
      "mattressPurchaseQuantity",
    ],
  },
  { label: "Pagamento", fields: ["isSponsored", "paymentStatus", "paidInHand", "paymentAmountPaid"] },
];

export default function ManualRegistrationPage() {
  const router = useRouter();
  const session = useSession();
  const [stops, setStops] = useState<TransportStopSummary[]>([]);
  const [tentTypes, setTentTypes] = useState<TentTypeSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
  const isLastStep = step === STEPS.length - 1;

  useEffect(() => {
    apiFetch<TransportStopSummary[]>("/transport-stops").then(setStops);
    apiFetch<TentTypeSummary[]>("/tent-types").then(setTentTypes);
  }, []);

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
      transportRequired: "false",
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
      wantsToBuyMattress: "false",
      mattressPurchaseQuantity: "1",
      isSponsored: "false",
      paymentStatus: "CONFIRMED",
      paidInHand: "true",
      paymentAmountPaid: "",
    },
  });

  const isMemberTibl = watch("isMemberTibl");
  const transportRequired = watch("transportRequired");
  const ownTransportType = watch("ownTransportType");
  const bringingChildren = watch("bringingChildren");
  const tentRequired = watch("tentRequired");
  const mattressRequired = watch("mattressRequired");
  const wantsToBuyTent = watch("wantsToBuyTent");
  const wantsToBuyMattress = watch("wantsToBuyMattress");
  const isSponsored = watch("isSponsored");
  const sponsored = isSponsored === "true";
  const paidInHand = watch("paidInHand");

  useEffect(() => {
    if (isMemberTibl === "true") setValue("church", TIBL_NAME);
    else if (isMemberTibl === "false") setValue("church", "");
  }, [isMemberTibl, setValue]);

  async function goNext() {
    let valid = await trigger(STEPS[step].fields);

    // Cross-field "required if" checks are done explicitly rather than
    // relying only on the zod object refine — trigger()'s partial-field
    // validation doesn't reliably surface those (same pattern as the public
    // registration form).
    if (valid && step === 0 && getValues("isMemberTibl") === "false") {
      const church = getValues("church");
      if (!church || church.trim().length < 2) {
        setError("church", { type: "manual", message: "Indique a igreja." });
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
      } else {
        const wants = getValues("wantsToBuyMattress");
        if (!wants) {
          setError("wantsToBuyMattress", { type: "manual", message: "Selecione uma opção." });
          valid = false;
        } else if (wants === "true") {
          const qty = parseInt(getValues("mattressPurchaseQuantity") || "", 10);
          if (!qty || qty < 1) {
            setError("mattressPurchaseQuantity", { type: "manual", message: "Indique quantos colchões." });
            valid = false;
          }
        }
      }
    }

    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: FormValues) {
    if (!session) return;

    const sponsored = values.isSponsored === "true";
    if (!sponsored) {
      if (!values.paymentAmountPaid || parseInt(values.paymentAmountPaid, 10) < 0) {
        setError("paymentAmountPaid", { type: "manual", message: "Indique quanto pagou." });
        return;
      }
      if (!values.paidInHand) {
        setError("paidInHand", { type: "manual", message: "Selecione uma opção." });
        return;
      }
      if (values.paidInHand === "false" && !paymentProof) {
        setPaymentProofError("Anexe o comprovativo de pagamento.");
        return;
      }
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
      formData.set("bringingChildren", String(values.bringingChildren === "true"));
      if (values.bringingChildren === "true") {
        formData.set("numberOfChildren", values.numberOfChildren || "0");
      }
      formData.set("transportRequired", String(values.transportRequired === "true"));
      if (values.transportRequired === "true" && values.transportStopId) {
        formData.set("transportStopId", values.transportStopId);
      } else if (values.transportRequired === "false" && values.ownTransportType) {
        formData.set("ownTransportType", values.ownTransportType);
        if (values.ownTransportType === "INDIVIDUAL") {
          formData.set("carSeats", values.carSeats || "");
          formData.set("carRouteStops", values.carRouteStops || "");
        }
      }
      formData.set("tentRequired", String(values.tentRequired));
      formData.set("mattressRequired", String(values.mattressRequired));
      if (!values.tentRequired) formData.set("tentsCanProvide", values.tentsCanProvide || "0");
      if (!values.mattressRequired) formData.set("mattressesCanProvide", values.mattressesCanProvide || "0");
      const buyingTent = values.tentRequired && values.wantsToBuyTent === "true" && !!values.tentPurchaseTypeId;
      formData.set("wantsToBuyTent", String(buyingTent));
      if (buyingTent) {
        formData.set("tentPurchaseTypeId", values.tentPurchaseTypeId!);
        formData.set("tentPurchaseQuantity", values.tentPurchaseQuantity || "1");
      }
      const buyingMattress = values.mattressRequired && values.wantsToBuyMattress === "true";
      formData.set("wantsToBuyMattress", String(buyingMattress));
      if (buyingMattress) {
        formData.set("mattressPurchaseQuantity", values.mattressPurchaseQuantity || "1");
      }
      formData.set("isSponsored", String(sponsored));
      formData.set("paymentStatus", values.paymentStatus);
      if (!sponsored) {
        formData.set("paymentAmountPaid", values.paymentAmountPaid!);
        formData.set("paidInHand", values.paidInHand!);
        if (values.paidInHand === "false" && paymentProof) {
          formData.set("paymentProof", paymentProof);
        }
      }

      const created = await apiFetch<ParticipantSummary>("/participants/manual", {
        method: "POST",
        token: session.accessToken,
        body: formData,
      });

      toast.success(`Inscrição de ${created.fullName} criada (${created.registrationNumber}).`);
      router.push("/admin/participantes");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar a inscrição.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <div className="animate-in fade-in mx-auto max-w-2xl space-y-6 duration-500">
      <div>
        <Link
          href="/admin/participantes"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar aos inscritos
        </Link>
      </div>

      <div className="text-center">
        <Image
          src="/cabecalho-inscricao.png"
          alt="Acampamento DUNAMIS"
          width={792}
          height={133}
          priority
          className="mx-auto w-full rounded-xl shadow-sm"
        />
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>📅 {EVENT_DATE_RANGE}</span>
          <span>📍 {EVENT_LOCATION}</span>
        </p>
      </div>

      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 font-display text-2xl tracking-wide text-dunamis-green">
          <UserPlus className="size-6 text-primary" />
          Registar inscrição manualmente
        </h1>
        <p className="text-sm text-muted-foreground">
          Para participantes sem forma de se inscrever pelo site. Se não for patrocinado, indique quanto pagou — se não
          foi em mão, é preciso anexar o comprovativo.
        </p>
      </div>

      <Card className="mx-auto max-w-2xl gap-0 overflow-hidden py-0">
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
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
                      </RadioGroup>
                    )}
                  />
                  {errors.isMemberTibl && <p className="text-sm text-destructive">{errors.isMemberTibl.message}</p>}
                </div>

                {isMemberTibl === "false" && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
                    <Label htmlFor="church">Qual a igreja?</Label>
                    <Input id="church" {...register("church")} />
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
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
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
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
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
                          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="MALE" /> Masculino</label>
                          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="FEMALE" /> Feminino</label>
                        </RadioGroup>
                      )}
                    />
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input id="birthDate" type="date" {...register("birthDate")} />
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
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergicTo">Alérgico(a) a alguma coisa?</Label>
                  <Input id="allergicTo" placeholder="Deixe em branco se não" {...register("allergicTo")} />
                </div>

                <div className="space-y-2">
                  <Label>Estado civil</Label>
                  <Controller
                    control={control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="SINGLE" /> Solteiro(a)</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="MARRIED" /> Casado(a)</label>
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
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
                      </RadioGroup>
                    )}
                  />
                </div>

                {bringingChildren === "true" && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
                    <Label htmlFor="numberOfChildren">Quantos filhos?</Label>
                    <Input id="numberOfChildren" type="number" min={1} {...register("numberOfChildren")} />
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
                  <Label>Vai usar o transporte da organização?</Label>
                  <Controller
                    control={control}
                    name="transportRequired"
                    render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
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
                        <Select onValueChange={(v) => field.onChange(v ?? "")} value={field.value || null}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a paragem">
                              {(value: string | null) => stops.find((s) => s.id === value)?.name ?? "Selecione a paragem"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {stops.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.transportStopId && <p className="text-sm text-destructive">{errors.transportStopId.message}</p>}
                  </div>
                )}

                {transportRequired === "false" && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-5 duration-300">
                    <div className="space-y-2">
                      <Label>Transporte individual ou táxi?</Label>
                      <Controller
                        control={control}
                        name="ownTransportType"
                        render={({ field }) => (
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="INDIVIDUAL" /> Individual</label>
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="TAXI" /> Táxi</label>
                          </RadioGroup>
                        )}
                      />
                      {errors.ownTransportType && (
                        <p className="text-sm text-destructive">{errors.ownTransportType.message}</p>
                      )}
                    </div>
                    {ownTransportType === "INDIVIDUAL" && (
                      <div className="animate-in fade-in slide-in-from-top-1 grid gap-4 duration-300 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="carSeats">Lugares no carro</Label>
                          <Input id="carSeats" type="number" min={1} {...register("carSeats")} />
                          {errors.carSeats && <p className="text-sm text-destructive">{errors.carSeats.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="carRouteStops">Paragens no trajeto</Label>
                          <Input id="carRouteStops" {...register("carRouteStops")} />
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
                    render={({ field }) => <Checkbox id="tentRequired" checked={field.value} onCheckedChange={field.onChange} />}
                  />
                  <Label htmlFor="tentRequired" className="font-normal">Precisa de tenda</Label>
                </div>
                {!tentRequired && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-2 pl-6 duration-300">
                    <Label htmlFor="tentsCanProvide">Pode disponibilizar tendas? Quantas?</Label>
                    <Input id="tentsCanProvide" type="number" min={0} {...register("tentsCanProvide")} />
                    {errors.tentsCanProvide && (
                      <p className="text-sm text-destructive">{errors.tentsCanProvide.message}</p>
                    )}
                  </div>
                )}
                {tentRequired && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-4 pl-6 duration-300">
                    <div className="space-y-2">
                      <Label>Vai comprar tenda?</Label>
                      <Controller
                        control={control}
                        name="wantsToBuyTent"
                        render={({ field }) => (
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
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
                            De momento não há tendas disponíveis para compra.
                          </p>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Tipo</Label>
                              <Controller
                                control={control}
                                name="tentPurchaseTypeId"
                                render={({ field }) => (
                                  <Select onValueChange={(v) => field.onChange(v ?? "")} value={field.value || null}>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Tipo de tenda">
                                        {(value: string | null) => {
                                          const t = tentTypes.find((tt) => tt.id === value);
                                          return t ? t.name : "Tipo de tenda";
                                        }}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tentTypes.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                              <Input id="tentPurchaseQuantity" type="number" min={1} {...register("tentPurchaseQuantity")} />
                              {errors.tentPurchaseQuantity && (
                                <p className="text-sm text-destructive">{errors.tentPurchaseQuantity.message}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="mattressRequired"
                    render={({ field }) => <Checkbox id="mattressRequired" checked={field.value} onCheckedChange={field.onChange} />}
                  />
                  <Label htmlFor="mattressRequired" className="font-normal">Precisa de colchão</Label>
                </div>
                {!mattressRequired && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-2 pl-6 duration-300">
                    <Label htmlFor="mattressesCanProvide">Pode disponibilizar colchões? Quantos?</Label>
                    <Input id="mattressesCanProvide" type="number" min={0} {...register("mattressesCanProvide")} />
                    {errors.mattressesCanProvide && (
                      <p className="text-sm text-destructive">{errors.mattressesCanProvide.message}</p>
                    )}
                  </div>
                )}
                {mattressRequired && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-4 pl-6 duration-300">
                    <div className="space-y-2">
                      <Label>Vai comprar colchão?</Label>
                      <Controller
                        control={control}
                        name="wantsToBuyMattress"
                        render={({ field }) => (
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
                          </RadioGroup>
                        )}
                      />
                      {errors.wantsToBuyMattress && (
                        <p className="text-sm text-destructive">{errors.wantsToBuyMattress.message}</p>
                      )}
                    </div>
                    {wantsToBuyMattress === "true" && (
                      <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
                        <Label htmlFor="mattressPurchaseQuantity">Quantos?</Label>
                        <Input id="mattressPurchaseQuantity" type="number" min={1} {...register("mattressPurchaseQuantity")} />
                        {errors.mattressPurchaseQuantity && (
                          <p className="text-sm text-destructive">{errors.mattressPurchaseQuantity.message}</p>
                        )}
                      </div>
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
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                        <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
                      </RadioGroup>
                    )}
                  />
                </div>
                {!sponsored && (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-5 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="paymentAmountPaid">Quanto pagou? (Kz)</Label>
                      <Input id="paymentAmountPaid" type="number" min={0} {...register("paymentAmountPaid")} />
                      {errors.paymentAmountPaid && (
                        <p className="text-sm text-destructive">{errors.paymentAmountPaid.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Foi pago em mão?</Label>
                      <Controller
                        control={control}
                        name="paidInHand"
                        render={({ field }) => (
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="true" /> Sim</label>
                            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="false" /> Não</label>
                          </RadioGroup>
                        )}
                      />
                      {errors.paidInHand && <p className="text-sm text-destructive">{errors.paidInHand.message}</p>}
                    </div>
                    {paidInHand === "false" && (
                      <div className="animate-in fade-in slide-in-from-top-1 space-y-2 duration-300">
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
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Estado do pagamento</Label>
                  <Controller
                    control={control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(v ?? "CONFIRMED")} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Estado do pagamento">
                            {(value: string) =>
                              value === "CONFIRMED" ? "Confirmado" : value === "REJECTED" ? "Rejeitado" : "Pendente"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                          <SelectItem value="PENDING">Pendente</SelectItem>
                          <SelectItem value="REJECTED">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se ficar &quot;Confirmado&quot;, o comprovativo em PDF com o QR Code é enviado por email de imediato.
                  </p>
                </div>
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
                  {submitting ? "A criar..." : "Criar inscrição"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
