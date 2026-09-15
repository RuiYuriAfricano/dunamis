"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, UserCog, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { PageLoading } from "@/components/ui/page-loading";
import { useSession } from "@/lib/use-session";
import { apiFetch, ApiError } from "@/lib/api";
import { Role, type UserSummary } from "@dunamis/types";

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const EMPTY_FORM: FormState = { name: "", email: "", password: "", role: Role.OPERATOR };

export default function UsersPage() {
  const session = useSession();
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManageUsers = session?.canManageUsers === true;

  useEffect(() => {
    if (!session || !canManageUsers) return;
    apiFetch<UserSummary[]>("/users", { token: session.accessToken })
      .then(setUsers)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(user: UserSummary) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!session) return;
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Indique nome e email.");
      return;
    }
    if (!editing && form.password.length < 6) {
      setFormError("A password deve ter pelo menos 6 caracteres.");
      return;
    }
    if (form.password && form.password.length < 6) {
      setFormError("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const body: Record<string, string> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        if (form.password) body.password = form.password;

        const updated = await apiFetch<UserSummary>(`/users/${editing.id}`, {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify(body),
        });
        setUsers((prev) => prev?.map((u) => (u.id === updated.id ? updated : u)) ?? prev);
        toast.success("Utilizador atualizado.");
      } else {
        const created = await apiFetch<UserSummary>("/users", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        });
        setUsers((prev) => (prev ? [...prev, created].sort((a, b) => a.name.localeCompare(b.name)) : [created]));
        toast.success("Utilizador criado.");
      }
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserSummary) {
    if (!session) return;
    if (!window.confirm(`Tem a certeza que quer eliminar a conta de ${user.name}?`)) return;

    setDeletingId(user.id);
    try {
      await apiFetch(`/users/${user.id}`, { method: "DELETE", token: session.accessToken });
      setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? prev);
      toast.success("Utilizador eliminado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível eliminar este utilizador.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!session) return null;

  if (!canManageUsers) {
    return <p className="text-sm text-muted-foreground">Não tem permissão para aceder a esta página.</p>;
  }

  if (loading) {
    return <PageLoading label="A carregar utilizadores..." />;
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl tracking-wide text-dunamis-green">
            <UserCog className="size-6 text-primary" />
            Utilizadores
          </h1>
          <p className="text-sm text-muted-foreground">
            {users ? `${users.length} conta(s)` : ""} · Gestão de contas de admin e operador.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}>
          <UserPlus className="size-4" />
          Criar utilizador
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Nome</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Email</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Papel</TableHead>
              <TableHead className="text-xs tracking-wide text-muted-foreground uppercase">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                  {user.canManageUsers && (
                    <Badge variant="default" className="ml-2">
                      Gestor de utilizadores
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell className="text-sm">
                  <Badge variant={user.role === Role.ADMIN ? "default" : "secondary"}>
                    {user.role === Role.ADMIN ? "Admin" : "Operador"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="outline" className="h-7 px-2" onClick={() => openEdit(user)} aria-label="Editar">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="h-7 border-destructive/40 px-2 text-destructive hover:bg-destructive/10"
                      disabled={deletingId === user.id || user.canManageUsers || user.email === session.email}
                      onClick={() => handleDelete(user)}
                      aria-label="Eliminar"
                    >
                      {deletingId === user.id ? <Spinner className="size-3" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar utilizador" : "Criar utilizador"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Deixe a password em branco para não a alterar."
                : "A conta fica disponível de imediato com estas credenciais."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nome</Label>
              <Input id="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">{editing ? "Nova password (opcional)" : "Password"}</Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: (v as Role) ?? Role.OPERATOR })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Papel">
                    {(value: string) => (value === Role.ADMIN ? "Admin" : "Operador")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                  <SelectItem value={Role.OPERATOR}>Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Spinner />}
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
