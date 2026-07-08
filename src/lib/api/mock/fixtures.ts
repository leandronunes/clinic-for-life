import type { Trainer } from "../trainers";
import type { Student } from "../students";
import type { Partner } from "../partners";
import type { Workout } from "../workouts";
import type { BioimpedanceMeasurement } from "../bioimpedance";
import type { BiomechanicalAssessment } from "../biomechanics";
import type { StructuralAssessment } from "../structural-assessment";
import type { Anamnesis } from "../anamnesis";
import type { Exam } from "../exams";
import type { EvolutionPhoto } from "../evolution-photos";
import type { BackendUser } from "../auth";

/** Seed trainers. `students_count` is recomputed by the store, not read from here. */
export const TRAINERS: Trainer[] = [
  {
    id: "trainer-1",
    name: "Rafael Monteiro",
    cpf: "123.456.789-00",
    cref: "012345-G/SP",
    email: "rafael@forlife.app",
    phone: "(11) 98888-1111",
    status: "active",
    students_count: 0,
  },
  {
    id: "trainer-2",
    name: "Beatriz Lima",
    cpf: "234.567.890-11",
    cref: "023456-G/SP",
    email: "bia@forlife.app",
    phone: "(11) 98888-2222",
    status: "active",
    students_count: 0,
  },
  {
    id: "trainer-3",
    name: "Carlos Eduardo",
    cpf: "345.678.901-22",
    cref: "034567-G/SP",
    email: "cadu@forlife.app",
    phone: "(11) 98888-3333",
    status: "blocked",
    students_count: 0,
  },
];

export const STUDENTS: Student[] = [
  {
    id: "student-1",
    name: "Júlia Ferreira",
    birth_date: "1996-04-12",
    sex: "female",
    email: "aluno@forlife.app",
    phone: "(11) 97777-1111",
    trainer_id: "trainer-1",
    trainer_name: "Rafael Monteiro",
    status: "active",
    health_plan: "Unimed",
    emergency_contact: "Marta Ferreira (11) 96666-1111",
    created_at: "2025-11-03T10:00:00.000Z",
  },
  {
    id: "student-2",
    name: "Pedro Almeida",
    birth_date: "1990-08-22",
    sex: "male",
    email: "pedro.almeida@example.com",
    phone: "(11) 97777-2222",
    trainer_id: "trainer-1",
    trainer_name: "Rafael Monteiro",
    status: "active",
    health_plan: null,
    emergency_contact: null,
    created_at: "2025-12-01T10:00:00.000Z",
  },
  {
    id: "student-3",
    name: "Mariana Costa",
    birth_date: "1998-02-15",
    sex: "female",
    email: "mariana.costa@example.com",
    phone: "(11) 97777-3333",
    trainer_id: "trainer-2",
    trainer_name: "Beatriz Lima",
    status: "active",
    health_plan: "Bradesco Saúde",
    emergency_contact: null,
    created_at: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "student-4",
    name: "Lucas Oliveira",
    birth_date: "1993-06-30",
    sex: "male",
    email: "lucas.oliveira@example.com",
    phone: "(11) 97777-4444",
    trainer_id: "trainer-2",
    trainer_name: "Beatriz Lima",
    status: "active",
    health_plan: null,
    emergency_contact: null,
    created_at: "2026-02-18T10:00:00.000Z",
  },
  {
    id: "student-5",
    name: "Fernanda Rocha",
    birth_date: "1985-11-09",
    sex: "female",
    email: "fernanda.rocha@example.com",
    phone: "(11) 97777-5555",
    trainer_id: "trainer-3",
    trainer_name: "Carlos Eduardo",
    status: "inactive",
    health_plan: null,
    emergency_contact: null,
    created_at: "2025-09-20T10:00:00.000Z",
  },
];

export const PARTNERS: Partner[] = [
  {
    id: "partner-1",
    name: "NutriVida",
    logo_url: null,
    category: "Nutrition",
    description: "Consultas de nutrição esportiva com desconto para alunos ForLife.",
    discount_details: "10% de desconto na primeira consulta para alunos do Núcleo For Life.",
    coupon: "FORLIFE10",
    link: "https://nutrivida.example.com",
    created_at: "2025-10-01T10:00:00.000Z",
  },
  {
    id: "partner-2",
    name: "FisioMove",
    logo_url: null,
    category: "Physiotherapy",
    description: "Clínica de fisioterapia esportiva e reabilitação.",
    discount_details: null,
    coupon: null,
    link: "https://fisiomove.example.com",
    created_at: "2025-10-05T10:00:00.000Z",
  },
  {
    id: "partner-3",
    name: "SuperSuplementos",
    logo_url: null,
    category: "Supplementation",
    description: "Loja de suplementos com cupom exclusivo para parceiros.",
    discount_details: "15% de desconto em toda a loja para membros ForLife.",
    coupon: "FORLIFE15",
    link: "https://supersuplementos.example.com",
    created_at: "2025-11-12T10:00:00.000Z",
  },
];

const EMPTY_WORKOUT_LISTS: Record<string, Workout[]> = {};

/** Workouts keyed by student id. Only `student-1` ships with sample data. */
export const WORKOUTS_BY_STUDENT: Record<string, Workout[]> = {
  ...EMPTY_WORKOUT_LISTS,
  "student-1": [
    {
      id: "workout-s1-a",
      position: 0,
      title: "Treino A",
      focus: "Superior",
      status: "active",
      created_at: "2026-01-05T10:00:00.000Z",
      archived_at: null,
      trainer_name: "Rafael Monteiro",
      exercises: [
        {
          id: "exercise-s1-a-1",
          position: 0,
          name: "Supino reto",
          sets: 4,
          reps: "10-12",
          load_kg: 40,
          rest_seconds: 60,
          muscle_group: "Peitoral",
          video_url: "",
          notes: null,
        },
        {
          id: "exercise-s1-a-2",
          position: 1,
          name: "Puxada frente",
          sets: 4,
          reps: "10-12",
          load_kg: 35,
          rest_seconds: 60,
          muscle_group: "Costas",
          video_url: "",
          notes: null,
        },
        {
          id: "exercise-s1-a-3",
          position: 2,
          name: "Desenvolvimento com halteres",
          sets: 3,
          reps: "12",
          load_kg: 12,
          rest_seconds: 45,
          muscle_group: "Ombros",
          video_url: "",
          notes: null,
        },
      ],
    },
    {
      id: "workout-s1-b",
      position: 1,
      title: "Treino B",
      focus: "Inferior",
      status: "active",
      created_at: "2026-01-05T10:00:00.000Z",
      archived_at: null,
      trainer_name: "Rafael Monteiro",
      exercises: [
        {
          id: "exercise-s1-b-1",
          position: 0,
          name: "Agachamento livre",
          sets: 4,
          reps: "8-10",
          load_kg: 60,
          rest_seconds: 90,
          muscle_group: "Quadríceps",
          video_url: "",
          notes: null,
        },
        {
          id: "exercise-s1-b-2",
          position: 1,
          name: "Cadeira extensora",
          sets: 3,
          reps: "12",
          load_kg: 30,
          rest_seconds: 60,
          muscle_group: "Quadríceps",
          video_url: "",
          notes: null,
        },
      ],
    },
    {
      id: "workout-s1-c",
      position: 0,
      title: "Treino C",
      focus: "Full body",
      status: "archived",
      created_at: "2025-11-10T10:00:00.000Z",
      archived_at: "2025-12-20T10:00:00.000Z",
      trainer_name: "Rafael Monteiro",
      exercises: [],
    },
  ],
};

export const BIOIMPEDANCE_BY_STUDENT: Record<string, BioimpedanceMeasurement[]> = {
  "student-1": [
    {
      id: "bio-s1-1",
      student_id: "student-1",
      measured_on: "2025-11-05",
      weight_kg: 68.4,
      muscle_mass_kg: 26.1,
      fat_percentage: 29.5,
      visceral_fat: 8,
      bmi: 24.1,
      source: "manual",
      photo_id: null,
      photo_url: null,
    },
    {
      id: "bio-s1-2",
      student_id: "student-1",
      measured_on: "2025-12-10",
      weight_kg: 67.1,
      muscle_mass_kg: 26.8,
      fat_percentage: 28.1,
      visceral_fat: 7,
      bmi: 23.7,
      source: "manual",
      photo_id: null,
      photo_url: null,
    },
    {
      id: "bio-s1-3",
      student_id: "student-1",
      measured_on: "2026-01-14",
      weight_kg: 65.9,
      muscle_mass_kg: 27.4,
      fat_percentage: 26.6,
      visceral_fat: 7,
      bmi: 23.3,
      source: "manual",
      photo_id: null,
      photo_url: null,
    },
  ],
};

export const BIOMECHANICS_BY_STUDENT: Record<string, BiomechanicalAssessment[]> = {
  "student-1": [
    {
      id: "biomech-s1-1",
      created_at: "2026-01-14T10:00:00.000Z",
      images: {},
    },
  ],
};

export const STRUCTURAL_BY_STUDENT: Record<string, StructuralAssessment> = {
  "student-1": {
    scoliosis: false,
    hyperkyphosis: false,
    hyperlordosis: false,
    spine_rotation: false,
    hip_rotation: false,
    scapular_girdle_imbalance: false,
    scapular_dyskinesis: false,
    shortening: false,
    limb_length_difference: false,
    pelvic_anteversion: false,
    pelvic_retroversion: false,
    knee_valgus: false,
    knee_varus: false,
    cavus_foot_arch: false,
    flat_foot_arch: false,
  },
};

export const ANAMNESIS_BY_STUDENT: Record<string, Anamnesis> = {
  "student-1": {
    objectives: "Emagrecimento e condicionamento geral",
    medicines: null,
    supplements: "Whey protein",
    systolic_pressure: 120,
    diastolic_pressure: 80,
    variable_glycemia: null,
    notes: null,
    height: 165,
    weight: 66,
    fracture: null,
    dislocations: null,
    pain: null,
    orthopedic_notes: null,
    meals: 4,
    hydration: "2L/dia",
    sleep: "7-8 horas",
    stool: "Regular",
    urine: "Normal",
  },
};

export const EXAMS_BY_STUDENT: Record<string, Exam[]> = {};

export const EVOLUTION_PHOTOS_BY_STUDENT: Record<string, EvolutionPhoto[]> = {};

/** Demo credentials — printed nowhere; documented in `.env.example`. */
export const MOCK_USERS: Array<BackendUser & { password: string }> = [
  {
    id: "user-admin-1",
    name: "Dra. Camila Andrade",
    email: "admin@forlife.app",
    password: "Admin@2026",
    role: "admin",
    avatar_url: null,
  },
  {
    id: "user-personal-1",
    name: "Rafael Monteiro",
    email: "personal@forlife.app",
    password: "Personal@2026",
    role: "personal",
    avatar_url: null,
    trainer_id: "trainer-1",
  },
  {
    id: "user-aluno-1",
    name: "Júlia Ferreira",
    email: "aluno@forlife.app",
    password: "Aluno@2026",
    role: "student",
    avatar_url: null,
    student_id: "student-1",
  },
];
