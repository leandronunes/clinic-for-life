import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/use-auth";
import { BrandLogo } from "@/components/BrandLogo";
import { ParceirosVitrine } from "@/components/ParceirosVitrine";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { validateStrongPassword, cn } from "@/lib/utils";
import { fetchOrganizations } from "@/lib/api/organizations";
import { toast } from "sonner";
import type { AuthUser, TrainerMode } from "@/lib/api/auth";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
});

type Role = "aluno" | "personal";
type Step = "role" | "trainer_mode" | "org_picker" | "org_create" | "account";

export function CadastroPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [trainerMode, setTrainerMode] = useState<TrainerMode | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDomain, setOrganizationDomain] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<string[]>([]);

  const goToDestination = useCallback(
    (user: AuthUser) => {
      if (user.role === "aluno") navigate({ to: "/aluno" });
      else if (user.pending_approval) navigate({ to: "/aguardando-aprovacao" });
      else navigate({ to: "/dashboard" });
    },
    [navigate],
  );

  const handleGoogleSuccess = useCallback(
    (user: AuthUser) => {
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      goToDestination(user);
    },
    [goToDestination],
  );

  const backFromAccount = () => {
    if (role === "aluno") return setStep("role");
    if (trainerMode === "solo") return setStep("trainer_mode");
    if (trainerMode === "join") return setStep("org_picker");
    return setStep("org_create");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    const errs = validateStrongPassword(password);
    if (errs.length) {
      setPwErrors(errs);
      toast.error("Senha não atende aos requisitos de segurança.");
      return;
    }
    setPwErrors([]);
    setLoading(true);
    try {
      const user = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirm,
        phone: phone.trim() || undefined,
        role: role === "personal" ? "personal" : "student",
        ...(role === "personal" && trainerMode ? { trainer_mode: trainerMode } : {}),
        ...(trainerMode === "join" && organizationId ? { organization_id: organizationId } : {}),
        ...(trainerMode === "create_org"
          ? {
              organization_name: organizationName.trim(),
              organization_domain: organizationDomain.trim(),
            }
          : {}),
      });
      toast.success(`Conta criada com sucesso! Bem-vindo(a), ${user.name.split(" ")[0]}.`);
      goToDestination(user);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Falha no cadastro";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // O Google é um fluxo de um clique só — não dá pra levar a escolha de
  // entrar/criar organização através do redirecionamento OAuth, então só
  // aparece nos caminhos onde a escolha já está completamente resolvida sem
  // precisar de mais nenhum dado (aluno, ou personal sozinho).
  const showGoogle = role === "aluno" || (role === "personal" && trainerMode === "solo");
  const googleRole = role === "personal" ? "personal" : undefined;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        {/* Painel visual à esquerda */}
        <div className="relative hidden flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex brand-gradient">
          <BrandLogo size={56} withWordmark inverted />
          <div className="relative z-10 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Crie sua conta e comece a sua <span className="text-accent">jornada</span>.
            </h1>
            <p className="mt-4 text-primary-foreground/80">
              Junte-se à Clínica For Life e acompanhe sua avaliação física, treinos e evolução em um
              único lugar.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/60">v4.0 · Núcleo For Life · MVP</div>
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -top-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* Formulário */}
        <div className="flex items-center justify-center bg-background p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <BrandLogo size={56} withWordmark />
            </div>

            {step === "role" && (
              <RoleStep
                onSelect={(r) => {
                  setRole(r);
                  setStep(r === "aluno" ? "account" : "trainer_mode");
                }}
              />
            )}

            {step === "trainer_mode" && (
              <TrainerModeStep
                onBack={() => setStep("role")}
                onSelect={(mode) => {
                  setTrainerMode(mode);
                  if (mode === "solo") setStep("account");
                  else if (mode === "join") setStep("org_picker");
                  else setStep("org_create");
                }}
              />
            )}

            {step === "org_picker" && (
              <OrgPickerStep
                onBack={() => setStep("trainer_mode")}
                onContinue={(id) => {
                  setOrganizationId(id);
                  setStep("account");
                }}
              />
            )}

            {step === "org_create" && (
              <OrgCreateStep
                name={organizationName}
                domain={organizationDomain}
                onNameChange={setOrganizationName}
                onDomainChange={setOrganizationDomain}
                onBack={() => setStep("trainer_mode")}
                onContinue={() => setStep("account")}
              />
            )}

            {step === "account" && (
              <>
                <button
                  type="button"
                  onClick={backFromAccount}
                  className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>

                <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {accountStepSubtitle(role, trainerMode, organizationName)}
                </p>

                <Card className="mt-6 shadow-soft">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Seu nome"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          maxLength={120}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="voce@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          maxLength={255}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone (opcional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="(11) 99999-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={20}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPw ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Mostrar/ocultar senha"
                          >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {pwErrors.length > 0 && (
                          <p className="text-xs text-destructive">
                            Senha precisa de: {pwErrors.join(", ")}.
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Mín. 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password_confirmation">Confirmar senha</Label>
                        <Input
                          id="password_confirmation"
                          type={showPw ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Criar conta
                      </Button>

                      {showGoogle && (
                        <>
                          <div className="relative my-2 text-center text-xs text-muted-foreground">
                            <span className="bg-card px-2 relative z-10">ou continue com</span>
                            <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
                          </div>

                          <GoogleLoginButton
                            className="w-full"
                            onSuccess={handleGoogleSuccess}
                            role={googleRole}
                          />
                        </>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
      <ParceirosVitrine />
    </main>
  );
}

function accountStepSubtitle(
  role: Role | null,
  trainerMode: TrainerMode | null,
  organizationName: string,
): string {
  if (role === "aluno") return "Preencha os dados abaixo para se cadastrar como aluno.";
  if (trainerMode === "solo")
    return "Preencha os dados abaixo para se cadastrar como personal (sozinho).";
  if (trainerMode === "join")
    return "Preencha os dados abaixo para pedir entrada na organização escolhida.";
  if (trainerMode === "create_org") {
    return `Preencha os dados abaixo para se cadastrar como admin de "${organizationName || "sua nova organização"}".`;
  }
  return "Preencha os dados abaixo para se cadastrar.";
}

function StepOption({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="font-medium text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

function RoleStep({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
      <p className="mt-1 text-sm text-muted-foreground">Como você vai usar a Clínica For Life?</p>
      <div className="mt-6 space-y-3">
        <StepOption
          icon={<GraduationCap className="h-5 w-5" />}
          title="Sou aluno"
          description="Quero acompanhar meus treinos e minha evolução."
          onClick={() => onSelect("aluno")}
        />
        <StepOption
          icon={<User className="h-5 w-5" />}
          title="Sou personal trainer"
          description="Quero gerenciar meus alunos e treinos."
          onClick={() => onSelect("personal")}
        />
      </div>
    </div>
  );
}

function TrainerModeStep({
  onSelect,
  onBack,
}: {
  onSelect: (mode: TrainerMode) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="text-2xl font-bold text-foreground">Como você vai atuar?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Você pode atuar sozinho ou fazer parte de uma organização (clínica, academia, estúdio).
      </p>
      <div className="mt-6 space-y-3">
        <StepOption
          icon={<User className="h-5 w-5" />}
          title="Sozinho"
          description="Vou atuar por conta própria, sem organização."
          onClick={() => onSelect("solo")}
        />
        <StepOption
          icon={<Users className="h-5 w-5" />}
          title="Entrar numa organização existente"
          description="Já existe uma organização cadastrada da qual eu faço parte."
          onClick={() => onSelect("join")}
        />
        <StepOption
          icon={<Building2 className="h-5 w-5" />}
          title="Criar uma nova organização"
          description="Vou fundar uma organização nova e serei seu admin."
          onClick={() => onSelect("create_org")}
        />
      </div>
    </div>
  );
}

function OrgPickerStep({
  onContinue,
  onBack,
}: {
  onContinue: (organizationId: string) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  });

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="text-2xl font-bold text-foreground">Qual organização?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sua entrada precisará ser aprovada pelo admin dela antes de você ter acesso completo.
      </p>

      <div className="mt-6 max-h-72 space-y-2 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando organizações...</p>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma organização cadastrada ainda.</p>
        ) : (
          organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setSelected(org.id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selected === org.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
              )}
            >
              <div className="font-medium text-foreground">{org.name}</div>
              <div className="text-xs text-muted-foreground">{org.domain}</div>
            </button>
          ))
        )}
      </div>

      <Button
        className="mt-4 w-full"
        disabled={!selected}
        onClick={() => selected && onContinue(selected)}
      >
        Continuar
      </Button>
    </div>
  );
}

function OrgCreateStep({
  name,
  domain,
  onNameChange,
  onDomainChange,
  onContinue,
  onBack,
}: {
  name: string;
  domain: string;
  onNameChange: (v: string) => void;
  onDomainChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h2 className="text-2xl font-bold text-foreground">Nova organização</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Você será o admin dela — poderá aprovar outros personais que pedirem pra entrar depois.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Nome da organização</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex.: Clínica Vitalidade"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-domain">Domínio (identificador único)</Label>
          <Input
            id="org-domain"
            value={domain}
            onChange={(e) => onDomainChange(e.target.value)}
            placeholder="Ex.: clinica-vitalidade"
            maxLength={63}
          />
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        disabled={!name.trim() || !domain.trim()}
        onClick={onContinue}
      >
        Continuar
      </Button>
    </div>
  );
}
