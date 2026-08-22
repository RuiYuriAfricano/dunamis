"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, UserPlus } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/use-session";
import { apiFetch, ApiError } from "@/lib/api";
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
    isSponsored: z.enum(["true", "false"]),
    paymentStatus: z.enum(["PENDING", "CONFIRMED", "REJECTED"]),
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

export default function ManualRegistrationPage() {
  const router = useRouter();
  const session = useSession();
  const [stops, setStops] = useState<TransportStopSummary[]>([]);
  const [tentTypes, setTentTypes] = useState<TentTypeSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
      isSponsored: "false",
      paymentStatus: "CONFIRMED",
    },
  });

  const isMemberTibl = watch("isMemberTibl");
  const transportRequired = watch("transportRequired");
  const ownTransportType = watch("ownTransportType");
  const bringingChildren = watch("bringingChildren");
  const tentRequired = watch("tentRequired");
  const mattressRequired = watch("mattressRequired");
  const wantsToBuyTent = watch("wantsToBuyTent");

  useEffect(() => {
    if (isMemberTibl === "true") setValue("church", TIBL_NAME);
    else if (isMemberTibl === "false") setValue("church", "");
  }, [isMemberTibl, setValue]);

  async function onSubmit(values: FormValues) {
    if (!session) return;
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        fullName: values.fullName,
        gender: values.gender,
        birthDate: values.birthDate,
        phone: stripPhoneMask(values.phone),
        whatsapp: stripPhoneMask(values.whatsapp),
        email: values.email,
        church: values.isMemberTibl === "true" ? TIBL_NAME : (values.church ?? ""),
        isMemberTibl: String(values.isMemberTibl === "true"),
        baptized: String(values.baptized === "true"),
        allergicTo: values.allergicTo?.trim() ?? "",
        firstTime: String(values.firstTime === "true"),
        maritalStatus: values.maritalStatus,
        bringingChildren: String(values.bringingChildren === "true"),
        transportRequired: String(values.transportRequired === "true"),
        tentRequired: String(values.tentRequired),
        mattressRequired: String(values.mattressRequired),
        isSponsored: String(values.isSponsored === "true"),
        paymentStatus: values.paymentStatus,
      };

      if (values.bringingChildren === "true") body.numberOfChildren = values.numberOfChildren || "0";

      if (values.transportRequired === "true" && values.transportStopId) {
        body.transportStopId = values.transportStopId;
      } else if (values.transportRequired === "false" && values.ownTransportType) {
        body.ownTransportType = values.ownTransportType;
        if (values.ownTransportType === "INDIVIDUAL") {
          body.carSeats = values.carSeats || "";
          body.carRouteStops = values.carRouteStops || "";
        }
      }

      if (!values.tentRequired) body.tentsCanProvide = values.tentsCanProvide || "0";
      if (!values.mattressRequired) body.mattressesCanProvide = values.mattressesCanProvide || "0";
      const buyingTent = values.tentRequired && values.wantsToBuyTent === "true" && !!values.tentPurchaseTypeId;
      body.wantsToBuyTent = String(buyingTent);
      if (buyingTent) {
        body.tentPurchaseTypeId = values.tentPurchaseTypeId!;
        body.tentPurchaseQuantity = values.tentPurchaseQuantity || "1";
      }

      const created = await apiFetch<ParticipantSummary>("/participants/manual", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify(body),
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
        <h1 className="flex items-center gap-2 font-display text-2xl tracking-wide text-dunamis-green">
          <UserPlus className="size-6 text-primary" />
          Registar inscrição manualmente
        </h1>
        <p className="text-sm text-muted-foreground">
          Para participantes sem forma de se inscrever pelo site. O comprovativo de pagamento não é necessário — defina
          diretamente o estado do pagamento abaixo.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Participação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
              <div className="space-y-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
              <div className="space-y-2">
                <Label htmlFor="numberOfChildren">Quantos filhos?</Label>
                <Input id="numberOfChildren" type="number" min={1} {...register("numberOfChildren")} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
              <div className="space-y-2">
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
              <div className="space-y-4">
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
                </div>
                {ownTransportType === "INDIVIDUAL" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="carSeats">Lugares no carro</Label>
                      <Input id="carSeats" type="number" min={1} {...register("carSeats")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carRouteStops">Paragens no trajeto</Label>
                      <Input id="carRouteStops" {...register("carRouteStops")} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alojamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="tentRequired"
                render={({ field }) => <Checkbox id="tentRequired" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <Label htmlFor="tentRequired" className="font-normal">Precisa de tenda</Label>
            </div>
            {!tentRequired && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="tentsCanProvide">Pode disponibilizar tendas? Quantas?</Label>
                <Input id="tentsCanProvide" type="number" min={0} {...register("tentsCanProvide")} />
              </div>
            )}
            {tentRequired && (
              <div className="space-y-4 pl-6">
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
                </div>
                {wantsToBuyTent === "true" && tentTypes.length > 0 && (
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
                                  return t ? `${t.name} — ${t.price.toLocaleString("pt-PT")} Kz` : "Tipo de tenda";
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {tentTypes.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name} — {t.price.toLocaleString("pt-PT")} Kz</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tentPurchaseQuantity">Quantas?</Label>
                      <Input id="tentPurchaseQuantity" type="number" min={1} {...register("tentPurchaseQuantity")} />
                    </div>
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
              <div className="space-y-2 pl-6">
                <Label htmlFor="mattressesCanProvide">Pode disponibilizar colchões? Quantos?</Label>
                <Input id="mattressesCanProvide" type="number" min={0} {...register("mattressesCanProvide")} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
                Se ficar "Confirmado", o comprovativo em PDF com o QR Code é enviado por email de imediato.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "A criar..." : "Criar inscrição"}
        </Button>
      </form>
    </div>
  );
}
