# React Forms — Validation, React Hook Form, Zod, and React 19 Actions

**Priority: HIGH**

> Everything about building forms in React that you hit at work: controlled vs
> uncontrolled, when plain `useState` is enough, React Hook Form + Zod (the default stack),
> React 19 form actions (`useActionState`, `useFormStatus`, `useOptimistic`), server
> validation and errors, dynamic field arrays, dependent fields, async validation,
> multi-step wizards, file uploads, autosave, unsaved-changes warnings, accessibility,
> performance, testing, and the interview questions.
>
> Browser-level form behaviour (submit/input/change events, FormData, the constraint
> validation API, `type="button"` gotchas) is in
> [BROWSER-DOM-EVENTS-DEEP.md §13](BROWSER-DOM-EVENTS-DEEP.md#13-forms-and-inputs).
>
> Library versions assumed: React 19, React Hook Form 7, Zod 4.

---

## Table of Contents

- [1. The Mental Model — Who Owns the Value](#1-the-mental-model--who-owns-the-value)
- [2. Plain React Forms — When useState Is Enough](#2-plain-react-forms--when-usestate-is-enough)
- [3. Choosing an Approach](#3-choosing-an-approach)
- [4. Zod — Schemas as the Single Source of Truth](#4-zod--schemas-as-the-single-source-of-truth)
- [5. React Hook Form — The Core API](#5-react-hook-form--the-core-api)
- [6. Validation Timing — When to Show Errors](#6-validation-timing--when-to-show-errors)
- [7. Controlled Components with Controller](#7-controlled-components-with-controller)
- [8. Building Reusable Field Components](#8-building-reusable-field-components)
- [9. Dynamic Fields — useFieldArray](#9-dynamic-fields--usefieldarray)
- [10. Dependent and Conditional Fields — watch and useWatch](#10-dependent-and-conditional-fields--watch-and-usewatch)
- [11. Async Validation — "Is This Username Taken?"](#11-async-validation--is-this-username-taken)
- [12. Submitting — Server Errors, Double Submit, Mutations](#12-submitting--server-errors-double-submit-mutations)
- [13. Edit Forms — Loading Defaults and Resetting](#13-edit-forms--loading-defaults-and-resetting)
- [14. React 19 Form Actions](#14-react-19-form-actions)
- [15. Server Actions in Next.js — Validating on the Server](#15-server-actions-in-nextjs--validating-on-the-server)
- [16. Multi-Step Forms and Wizards](#16-multi-step-forms-and-wizards)
- [17. File Uploads](#17-file-uploads)
- [18. Autosave and Unsaved-Changes Warnings](#18-autosave-and-unsaved-changes-warnings)
- [19. Accessibility for Forms](#19-accessibility-for-forms)
- [20. UX Rules That Make Forms Feel Good](#20-ux-rules-that-make-forms-feel-good)
- [21. Performance — Why Big Forms Get Slow](#21-performance--why-big-forms-get-slow)
- [22. Testing Forms](#22-testing-forms)
- [23. Common Pitfalls](#23-common-pitfalls)
- [24. Interview Questions](#24-interview-questions)
- [Related Files](#related-files)

---

## 1. The Mental Model — Who Owns the Value

```text
‼️ EVERY INPUT HAS ONE OWNER OF ITS CURRENT VALUE

  CONTROLLED — React state owns it
     const [email, setEmail] = useState('');
     <input value={email} onChange={e => setEmail(e.target.value)} />

     typing → onChange → setEmail → re-render → React writes value back to the input
     ✅ you always know the value; easy to transform, validate live, disable buttons
     ❌ every keystroke re-renders the component that owns the state

  UNCONTROLLED — the DOM owns it
     <input name="email" defaultValue="" />
     read it when needed: new FormData(form).get('email')  or  ref.current.value

     typing → the browser updates the input; React doesn't re-render
     ✅ fast, simple, works with plain HTML form features and React 19 actions
     ❌ to react to changes live, you need listeners or a library

  React Hook Form is "uncontrolled with superpowers": it registers DOM inputs via refs,
  reads their values itself, and re-renders only the parts that subscribe to
  something (an error, a watched value). That's why it's fast for big forms.
```

```text
THE LIFE OF A FORM — what every form needs to handle

   default values → user edits → validation → show errors → submit
        ↑                                                       ↓
     reset ←── success ←── server response ──→ server errors (map to fields)
                                                  ↓
                                         pending state / double-submit guard

   State you'll track (RHF gives you all of these in formState):
     values        current field values
     errors        per-field + form-level errors
     touched       which fields the user has visited (blurred)
     dirty         which fields differ from the default values
     isSubmitting  a submit is in flight
     isSubmitSuccessful / submitCount
```

---

## 2. Plain React Forms — When useState Is Enough

```jsx
// A small form (login, search, newsletter): no library needed.
function LoginForm({ onLogin }) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();                                  // ‼️ stop the page reload
    const form = e.currentTarget;
    const { email, password } = Object.fromEntries(new FormData(form));
    setPending(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message ?? 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {/* Native validation (required, type=email) runs before onSubmit — free and accessible */}
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />

      {error && <p role="alert">{error}</p>}
      <button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
```

```jsx
// Controlled version with one state object — fine up to ~5–10 fields
function ProfileForm() {
  const [values, setValues] = useState({ name: '', bio: '', newsletter: false });

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    // ‼️ functional update + spread: keep other fields, change one
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); save(values); }}>
      <input name="name" value={values.name} onChange={handleChange} />
      <textarea name="bio" value={values.bio} onChange={handleChange} />
      <label>
        <input name="newsletter" type="checkbox" checked={values.newsletter} onChange={handleChange} />
        Newsletter
      </label>
      <button>Save</button>
    </form>
  );
}
// Once you need: per-field errors, touched/dirty tracking, async validation, field arrays,
// or the same rules on the server — switch to RHF + Zod rather than growing this by hand.
```

---

## 3. Choosing an Approach

```text
  SITUATION                                   USE
  ──────────────────────────────────────────  ─────────────────────────────────────────
  1–3 fields, simple rules                    plain <form> + FormData, native validation
  Search box, filter bar                      controlled input (+ debounce), no form lib
  Real app forms: 4+ fields, errors,          ‼️ React Hook Form + Zod
  dirty tracking, dynamic fields              (the default in most React codebases)
  Next.js / React Router framework,           <form action> + useActionState + Zod on the
  progressive enhancement, server-first       server (§14, §15) — optionally RHF on top
  Very complex, type-heavy forms;             TanStack Form (fully typed field paths,
  you like TanStack's style                   framework-agnostic) — newer, smaller ecosystem
  Legacy code                                 Formik — still around, slower, less active;
                                              don't start new forms with it
```

---

## 4. Zod — Schemas as the Single Source of Truth

```text
‼️ WHY A SCHEMA

   One Zod schema gives you:
     - client validation (via the RHF resolver)
     - server validation (same schema in the API route / server action)
     - the TypeScript type of the form values (z.infer)
     - parsing/transforming input ("42" → 42, trim strings)

   Write the rules once, share them between frontend and backend.
```

```ts
import { z } from 'zod';

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    email: z.email('Enter a valid email'),                 // Zod 4: z.email() (v3: z.string().email())
    age: z.coerce.number().int().min(18, 'You must be 18 or older').optional(),
    // ‼️ coerce: inputs give STRINGS. coerce turns "42" into 42 before checking.
    // Careful: z.coerce.number() turns "" into 0. For optional number fields, preprocess
    // "" to undefined (see emptyToUndefined below).
    password: z.string().min(8, 'At least 8 characters')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
    role: z.enum(['viewer', 'editor', 'admin']),
    website: z.url().optional().or(z.literal('')),         // optional, but valid if filled
    tags: z.array(z.string()).max(5),
    acceptTerms: z.literal(true, { error: 'You must accept the terms' }),
  })
  // Cross-field rule: attach the error to a specific field with `path`
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],          // ‼️ without path, the error is form-level ("root")
  });

export type SignupValues = z.infer<typeof signupSchema>;        // output type (after transforms)
export type SignupInput = z.input<typeof signupSchema>;         // input type (before coerce)

// Helper: treat empty inputs as "not provided"
const emptyToUndefined = (schema: z.ZodType) =>
  z.preprocess(v => (v === '' || v === null ? undefined : v), schema);
// age: emptyToUndefined(z.coerce.number().int().min(18).optional())
```

```ts
// ── Using a schema directly (server, tests, non-RHF code) ───────────────────
const result = signupSchema.safeParse(input);     // never throws
if (!result.success) {
  result.error.issues;                // [{ path: ['email'], message: 'Enter a valid email', ... }]
  z.flattenError(result.error);       // { formErrors: [], fieldErrors: { email: ['...'] } }
} else {
  result.data;                        // typed, transformed values
}
signupSchema.parse(input);            // throws ZodError on failure

// ── Useful pieces ───────────────────────────────────────────────────────────
z.string().trim().toLowerCase()            // transform while validating
z.string().optional()                      // string | undefined
z.string().nullable()                      // string | null
z.discriminatedUnion('type', [             // different fields depending on a choice
  z.object({ type: z.literal('card'), cardNumber: z.string().length(16) }),
  z.object({ type: z.literal('bank'), iban: z.string().min(15) }),
])
z.object({...}).superRefine((data, ctx) => {   // several custom errors at once
  if (data.end < data.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'End before start' });
})
// Reusing parts of a schema: build from a BASE object without refinements, because
// pick/omit/extend on a refined object schema throws in Zod 4.
const signupBase = z.object({ name: z.string(), email: z.email(), password: z.string() });
signupBase.pick({ email: true })           // one step of a wizard
signupBase.partial()                       // all optional (PATCH payloads)
signupBase.extend({ inviteCode: z.string() })
// then add cross-field rules last: signupBase.extend({...}).refine(...)
```

---

## 5. React Hook Form — The Core API

```tsx
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function SignupForm() {
  const {
    register,          // connects a native input: name, ref, onChange, onBlur
    handleSubmit,      // wraps your submit: validates first, calls you only if valid
    formState: { errors, isSubmitting, isDirty, isValid },
    reset,             // replace values/defaults, clear errors
    setError,          // set an error manually (server errors)
    setValue,          // change a value programmatically
    getValues,         // read values without subscribing (no re-render)
    watch,             // read + subscribe (re-renders on change)
    setFocus,          // focus a field by name
    control,           // for Controller / useFieldArray / useWatch
  } = useForm<SignupInput, unknown, SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {          // ‼️ always provide defaults — every field, '' not undefined
      name: '', email: '', password: '', confirmPassword: '',
      role: 'viewer', website: '', tags: [], acceptTerms: false,
    },
    mode: 'onTouched',        // when to validate — see §6
  });

  const onSubmit: SubmitHandler<SignupValues> = async (values) => {
    // values are already validated AND transformed by Zod (age is a number here)
    await api.signup(values);
    reset();                  // back to defaultValues
  };

  return (
    // ‼️ handleSubmit calls e.preventDefault() for you
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="name">Name</label>
      <input id="name" {...register('name')} aria-invalid={!!errors.name}
             aria-describedby={errors.name ? 'name-error' : undefined} />
      {errors.name && <p id="name-error" role="alert">{errors.name.message}</p>}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" {...register('email')} />
      {errors.email && <p role="alert">{errors.email.message}</p>}

      <label htmlFor="age">Age (optional)</label>
      <input id="age" type="number" inputMode="numeric" {...register('age')} />

      <select {...register('role')}>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
      </select>

      <label>
        <input type="checkbox" {...register('acceptTerms')} /> I accept the terms
      </label>
      {errors.acceptTerms && <p role="alert">{errors.acceptTerms.message}</p>}

      {errors.root?.server && <p role="alert">{errors.root.server.message}</p>}

      <button disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create account'}</button>
    </form>
  );
}
```

```text
‼️ WHAT register('name') RETURNS

   { name: 'name', ref, onChange, onBlur }
   Spread it onto a NATIVE input (or a component that forwards ref + these handlers to one).
   RHF reads the DOM value through the ref — your component doesn't hold the value in state.

   noValidate on the <form>: turns off the browser's own bubbles so only your Zod messages show
   (keep native attributes like type="email" for the right mobile keyboard).

   isSubmitting is true while your async onSubmit is running — if onSubmit returns a
   Promise. ‼️ If you don't await inside onSubmit, isSubmitting flips back immediately.

   register options (without a resolver):  register('age', { required: 'Required',
     min: { value: 18, message: '18+' }, valueAsNumber: true, validate: v => ... })
   With a Zod resolver, put all rules in the schema instead — don't mix both.
```

---

## 6. Validation Timing — When to Show Errors

```text
  useForm({ mode, reValidateMode })

  mode: when validation runs BEFORE the first submit
    'onSubmit'   (default) only when the user submits
    'onBlur'     when a field loses focus
    'onTouched'  ‼️ first on blur, then on every change once touched — the best default UX
    'onChange'   every keystroke — errors appear while typing the first character (annoying),
                 and costs a re-render per keystroke
    'all'        blur + change

  reValidateMode: when validation runs AFTER a failed submit
    'onChange'   (default) — errors disappear as soon as the user fixes them ✅

  ‼️ GOOD UX RULE
     Don't scold users while they're still typing a field for the first time.
     Validate when they leave the field (blur) or submit. Once a field has an error,
     re-validate on every change so the error clears the moment it's fixed.
     → mode: 'onTouched' gives exactly this.

  trigger('email')        validate a field manually (e.g. "Next" in a wizard)
  trigger(['a', 'b'])     several fields
  clearErrors('email')
```

---

## 7. Controlled Components with Controller

```text
‼️ register() needs a NATIVE input it can attach a ref to.

   Many UI-library components don't expose a native input or don't use DOM events:
   custom Select / Combobox, DatePicker, Slider, Switch, rich text editors, react-select,
   MUI/Mantine/shadcn components built on Radix.
   Their API is   value + onChange(newValue)   — not   onChange(event).

   → wrap them in <Controller> (or useController) to bridge RHF and the component.
```

```tsx
import { Controller } from 'react-hook-form';

<Controller
  name="country"
  control={control}
  render={({ field, fieldState }) => (
    <>
      <CountrySelect
        value={field.value}
        onChange={field.onChange}      // RHF accepts a value OR an event here
        onBlur={field.onBlur}          // ‼️ needed for touched + onBlur/onTouched validation
        ref={field.ref}                // lets RHF focus it on error (if the component forwards ref)
        invalid={!!fieldState.error}
      />
      {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
    </>
  )}
/>

// shadcn/ui Switch (Radix) example: different prop names, same idea
<Controller name="newsletter" control={control}
  render={({ field }) => (
    <Switch checked={field.value} onCheckedChange={field.onChange} />
  )}
/>

// ‼️ Value shape must match the schema: if the select returns { value, label } objects but
// the schema expects a string id, convert in onChange: onChange={opt => field.onChange(opt?.value)}
```

---

## 8. Building Reusable Field Components

```tsx
// A text field that works with register() — forwards ref and handlers to the input.
// React 19: ref is a normal prop.
type TextFieldProps = React.ComponentProps<'input'> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, id, ref, ...inputProps }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...inputProps}                         // name, onChange, onBlur from register()
      />
      {hint && <p id={hintId} className="hint">{hint}</p>}
      {error && <p id={errorId} className="error">{error}</p>}
    </div>
  );
}

// Usage
<TextField label="Email" type="email" {...register('email')} error={errors.email?.message} />
```

```tsx
// Deeply nested fields without prop-drilling `register` and `errors`: FormProvider
import { FormProvider, useFormContext } from 'react-hook-form';

function AddressSection() {
  const { register, formState: { errors } } = useFormContext<OrderValues>();
  return <TextField label="City" {...register('address.city')} error={errors.address?.city?.message} />;
}

function OrderForm() {
  const methods = useForm<OrderValues>({ resolver: zodResolver(orderSchema), defaultValues });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)}>
        <AddressSection />
        <button>Place order</button>
      </form>
    </FormProvider>
  );
}
// ‼️ Nested names use dot paths: 'address.city', 'items.0.qty'. errors mirrors that shape.
// shadcn/ui's <Form>, <FormField>, <FormItem>, <FormMessage> are exactly this pattern
// (FormProvider + Controller + accessible ids) pre-built.
```

---

## 9. Dynamic Fields — useFieldArray

```tsx
// Invoice line items, multiple email addresses, survey questions...
const schema = z.object({
  items: z.array(z.object({
    description: z.string().min(1, 'Required'),
    qty: z.coerce.number().int().min(1),
    price: z.coerce.number().min(0),
  })).min(1, 'Add at least one item'),
});

function InvoiceForm() {
  const { control, register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ description: '', qty: 1, price: 0 }] },
  });
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: 'items' });

  return (
    <form onSubmit={handleSubmit(save)}>
      {fields.map((field, index) => (
        // ‼️ key={field.id} — RHF generates stable ids. NEVER key={index}: removing a row
        // would shift inputs and show the wrong values/errors in the remaining rows.
        <fieldset key={field.id}>
          <legend className="sr-only">Item {index + 1}</legend>
          <input {...register(`items.${index}.description`)} placeholder="Description" />
          {errors.items?.[index]?.description && <p role="alert">{errors.items[index].description.message}</p>}
          <input type="number" {...register(`items.${index}.qty`)} />
          <input type="number" step="0.01" {...register(`items.${index}.price`)} />
          <button type="button" onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>✕</button>
        </fieldset>
      ))}
      {/* array-level error (the .min(1) rule) */}
      {errors.items?.root && <p role="alert">{errors.items.root.message}</p>}

      {/* ‼️ type="button" — otherwise "Add item" submits the form */}
      <button type="button" onClick={() => append({ description: '', qty: 1, price: 0 })}>
        Add item
      </button>
      <button type="submit">Save invoice</button>
    </form>
  );
}
// append/insert need a COMPLETE object (all fields), not partial.
// Array-level errors: errors.items.root (or errors.items.message in some versions).
```

---

## 10. Dependent and Conditional Fields — watch and useWatch

```tsx
// Show a field only when another field has a value
function ShippingForm() {
  const { register, control } = useForm<ShippingValues>({ defaultValues });

  // useWatch re-renders ONLY this component when 'method' changes (not the whole form)
  const method = useWatch({ control, name: 'method' });

  return (
    <>
      <select {...register('method')}>
        <option value="pickup">Pickup</option>
        <option value="delivery">Delivery</option>
      </select>
      {method === 'delivery' && <input {...register('address')} placeholder="Address" />}
    </>
  );
}
```

```text
‼️ WATCH CAREFULLY

   watch() in the form component    → the WHOLE form re-renders on every change of the
                                      watched field(s). watch() with no args = every field.
   useWatch({ control, name })      → only the component calling it re-renders.
                                      ‼️ Put it in a small child component for live
                                      previews / totals in big forms.
   getValues()                      → read once, no subscription (inside handlers).

   CONDITIONAL VALIDATION — make the schema match the UI:
     z.discriminatedUnion('method', [
       z.object({ method: z.literal('pickup') }),
       z.object({ method: z.literal('delivery'), address: z.string().min(5) }),
     ])
   Otherwise the hidden field's rule still fails and blocks submit.

   UNMOUNTED FIELDS: by default RHF KEEPS values of fields that unmount.
     useForm({ shouldUnregister: true })  → drop them when hidden
     or clear them yourself: setValue('address', '')
```

```tsx
// Derived value: live total for line items, in its own component
function InvoiceTotal({ control }) {
  const items = useWatch({ control, name: 'items' });
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  return <output>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(total)}</output>;
}

// Changing one field when another changes — do it in the handler, not an effect
<select {...register('country', {
  onChange: () => setValue('state', '', { shouldValidate: false }),   // reset dependent field
})} />
```

---

## 11. Async Validation — "Is This Username Taken?"

```text
OPTIONS
  1. Validate on BLUR with an async check — simplest, few requests.
  2. Debounced check while typing + inline "✓ available" hint — nicer, more requests.
  3. Only on submit, mapping the server's 409 to the field (§12) — always needed anyway,
     because the name can be taken between your check and the submit.

  ‼️ The server must ALWAYS re-check. Client-side async validation is a UX hint, not a guarantee.
```

```tsx
// Option 1: async refine in Zod — runs with the resolver
const schema = z.object({
  username: z.string().min(3).refine(async (name) => {
    const res = await fetch(`/api/username-available?u=${encodeURIComponent(name)}`);
    return (await res.json()).available;
  }, 'That username is taken'),
});
// With mode 'onTouched' this runs on blur, then on every change after — consider option 2
// to avoid a request per keystroke.

// Option 2: debounced, cancellable check in a field component
function UsernameField() {
  const { register, control, setError, clearErrors } = useFormContext();
  const username = useWatch({ control, name: 'username' });
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');

  useEffect(() => {
    if (!username || username.length < 3) { setStatus('idle'); return; }
    const ac = new AbortController();
    setStatus('checking');
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username-available?u=${encodeURIComponent(username)}`, { signal: ac.signal });
        const { available } = await res.json();
        setStatus(available ? 'ok' : 'taken');
        if (available) clearErrors('username');
        else setError('username', { type: 'server', message: 'That username is taken' });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStatus('idle');
      }
    }, 400);                                  // debounce
    return () => { clearTimeout(id); ac.abort(); };   // ‼️ cancel stale checks (race conditions)
  }, [username, setError, clearErrors]);

  return (
    <>
      <input {...register('username')} aria-describedby="username-status" />
      <span id="username-status" aria-live="polite">
        {status === 'checking' ? 'Checking…' : status === 'ok' ? '✓ Available' : ''}
      </span>
    </>
  );
}
// Note: errors set with setError are cleared when the field re-validates via the resolver.
```

---

## 12. Submitting — Server Errors, Double Submit, Mutations

```tsx
// With TanStack Query's useMutation — the common production setup
function CreateProjectForm() {
  const queryClient = useQueryClient();
  const form = useForm<ProjectValues>({ resolver: zodResolver(projectSchema), defaultValues });
  const { setError, handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  const mutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const onSubmit = async (values: ProjectValues) => {
    try {
      await mutation.mutateAsync(values);     // ‼️ await → isSubmitting stays true until done
      reset();
      toast('Project created');
    } catch (err) {
      applyServerErrors(err, setError);
    }
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...
    {errors.root?.server && <p role="alert">{errors.root.server.message}</p>}
    <button disabled={isSubmitting}>Create</button>
  </form>;
}

// ‼️ Map server validation errors onto fields so they show next to the right input.
// Agree on an error shape with the backend, e.g. 422 { fieldErrors: { name: ["Already exists"] } }
function applyServerErrors(err: unknown, setError: UseFormSetError<any>) {
  const body = (err as any)?.body;
  if (body?.fieldErrors) {
    let first = true;
    for (const [field, messages] of Object.entries(body.fieldErrors as Record<string, string[]>)) {
      setError(field as any, { type: 'server', message: messages[0] }, { shouldFocus: first });
      first = false;
    }
  } else {
    // anything else → form-level error ("root.*" keys don't block re-submitting)
    setError('root.server', { type: 'server', message: 'Something went wrong. Please try again.' });
  }
}
```

```text
‼️ DOUBLE SUBMIT

   Users double-click, press Enter twice, or retry on slow networks.
     - disable the submit button while isSubmitting (and show progress text)
     - handleSubmit does NOT dedupe: two quick submits run onSubmit twice if the button
       is still enabled — so do disable it
     - for payments/orders: an idempotency key on the request so the SERVER ignores duplicates
       (generate a UUID when the form mounts / when the attempt starts)

   SUCCESS
     - reset() to defaults, or reset(savedValues) to make the new values the defaults
       (so the form isn't "dirty" anymore)
     - move focus somewhere sensible / navigate / show a toast that's announced (role="status")

   FAILURE
     - keep the user's input ‼️ never clear the form on error
     - focus the first invalid field (RHF does this for validation errors: shouldFocusError
       is on by default; for server errors pass { shouldFocus: true })
```

---

## 13. Edit Forms — Loading Defaults and Resetting

```tsx
// ‼️ defaultValues are read ONCE, on the first render. If the data arrives later,
// changing defaultValues does nothing — you must reset() or use the `values` prop.

// Option A: render the form only when data is ready (simplest, ‼️ recommended)
function EditProjectPage({ id }) {
  const { data } = useQuery({ queryKey: ['project', id], queryFn: () => api.getProject(id) });
  if (!data) return <Spinner />;
  return <ProjectForm key={data.id} defaultValues={toFormValues(data)} />;
  // key={data.id}: navigating to another project remounts the form with fresh defaults
}

// Option B: keep the form mounted, reset when data arrives
const form = useForm<ProjectValues>({ defaultValues: emptyValues });
useEffect(() => { if (data) form.reset(toFormValues(data)); }, [data, form]);

// Option C: the `values` prop — RHF syncs the form whenever `values` changes
useForm({ values: data ? toFormValues(data) : undefined, resetOptions: { keepDirtyValues: true } });
// keepDirtyValues: background refetches don't overwrite what the user already edited.

// ‼️ Convert API data to FORM shape at the boundary:
//    null → '' for text inputs, numbers → strings if your inputs are strings,
//    ISO instants → datetime-local strings (see JS-DATES-TIME-INTL-DEEP.md §16)
function toFormValues(p: Project): ProjectValues {
  return { name: p.name, description: p.description ?? '', dueDate: p.dueDate ?? '' };
}

// Only send what changed (PATCH):
const { dirtyFields } = form.formState;
const patch = Object.fromEntries(Object.keys(dirtyFields).map(k => [k, values[k]]));
```

---

## 14. React 19 Form Actions

```text
‼️ WHAT CHANGED IN REACT 19

   <form action={fn}>  — pass a FUNCTION as the form's action.
     React calls fn(formData) on submit (no e.preventDefault needed), wraps it in a
     transition, tracks pending state, and RESETS uncontrolled fields after it succeeds.

   useActionState(action, initialState)  → [state, formAction, isPending]
     state      whatever your action returned last time (errors, success message, values)
     formAction pass to <form action={formAction}>
     isPending  true while it runs

   useFormStatus()  (from react-dom)  → { pending, data, method, action }
     read the PARENT form's status from inside any child component — e.g. a SubmitButton

   useOptimistic(state, updateFn)  → show the expected result immediately, roll back on error

   Works with plain client functions AND with server functions ('use server') in
   frameworks like Next.js — where the form works even before JS loads (progressive
   enhancement).
```

```tsx
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

type State = { errors?: Record<string, string[]>; message?: string; values?: Record<string, string> };

async function subscribeAction(prev: State, formData: FormData): Promise<State> {
  const values = Object.fromEntries(formData) as Record<string, string>;
  const parsed = z.object({ email: z.email('Enter a valid email') }).safeParse(values);
  if (!parsed.success) {
    // ‼️ return the values too: React resets the form after the action, so without this
    // the user's input disappears on a validation error
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  await api.subscribe(parsed.data.email);
  return { message: 'Subscribed!' };
}

function SubmitButton() {
  const { pending } = useFormStatus();          // ‼️ must be INSIDE the <form>
  return <button disabled={pending}>{pending ? 'Subscribing…' : 'Subscribe'}</button>;
}

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(subscribeAction, {});
  return (
    <form action={formAction}>
      <label htmlFor="nl-email">Email</label>
      <input id="nl-email" name="email" type="email" defaultValue={state.values?.email}
             aria-invalid={!!state.errors?.email} aria-describedby="nl-email-error" />
      {state.errors?.email && <p id="nl-email-error" role="alert">{state.errors.email[0]}</p>}
      <SubmitButton />
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

```tsx
// useOptimistic — a todo appears instantly, before the server confirms
function Todos({ todos, addTodoAction }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (current, newText: string) => [...current, { id: 'temp-' + current.length, text: newText, pending: true }],
  );
  async function action(formData: FormData) {
    const text = String(formData.get('text'));
    addOptimistic(text);              // shown immediately
    await addTodoAction(text);        // when the real list updates, the optimistic one is replaced;
  }                                   // if it throws, the optimistic item disappears
  return (
    <>
      <ul>{optimisticTodos.map(t => <li key={t.id} style={{ opacity: t.pending ? 0.5 : 1 }}>{t.text}</li>)}</ul>
      <form action={action}><input name="text" required /><button>Add</button></form>
    </>
  );
}
```

```text
RHF OR ACTIONS?

  Actions shine for: simple forms, server-first apps, progressive enhancement, less client JS.
  RHF shines for:    rich client validation as you type, field arrays, dirty tracking,
                     complex conditional UIs, big forms.
  ‼️ They combine: use RHF for the client experience, then submit to a server action:
     onSubmit = handleSubmit(values => startTransition(() => serverAction(values)))
  and ALWAYS validate again on the server with the same Zod schema.
```

---

## 15. Server Actions in Next.js — Validating on the Server

```ts
// app/projects/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { projectSchema } from '@/lib/schemas';     // ‼️ the SAME schema the client uses

export type ActionState = { fieldErrors?: Record<string, string[]>; formError?: string };

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();                       // ‼️ server actions are public HTTP endpoints:
  if (!session) return { formError: 'Not signed in' };// always authenticate + authorize inside

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await db.project.create({ data: { ...parsed.data, ownerId: session.userId } });
  } catch (e) {
    if (isUniqueViolation(e)) return { fieldErrors: { name: ['A project with this name exists'] } };
    return { formError: 'Could not create the project' };
  }
  revalidatePath('/projects');
  redirect('/projects');            // ‼️ redirect throws internally — call it outside try/catch
}
```

```text
SERVER-SIDE RULES (any backend: Next.js, Express, FastAPI)
  - Never trust client validation. Re-validate everything with the shared schema.
  - FormData values are all strings (or File). Use z.coerce for numbers/booleans/dates;
    unchecked checkboxes are MISSING, not "false".
  - Return field errors in one consistent shape: { fieldErrors: { field: [messages] }, formError }
    → one helper on the client maps it to setError / renders it.
  - Return 422 for validation errors, 409 for conflicts (duplicate), 400 for malformed input.
  - Don't echo secrets (passwords) back in the returned values.
```

More: [../2-medium-priority/NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md), [../2-medium-priority/API-DESIGN-DEEP.md](../2-medium-priority/API-DESIGN-DEEP.md).

---

## 16. Multi-Step Forms and Wizards

```text
TWO WAYS TO STRUCTURE IT

  ONE useForm for all steps (‼️ usually best)
    - one schema, one set of values; steps are just different visible fields
    - "Next" validates only the current step's fields: await trigger(stepFields[step])
    - fields of hidden steps must stay registered → shouldUnregister: false (the default)
    - submit once at the end

  ONE form PER step, state held outside (context / Zustand / URL)
    - each step has its own schema and useForm
    - on "Next", save that step's values into the shared store
    - good when steps are separate routes (/checkout/shipping, /checkout/payment)
      or saved to the server after each step

  Either way:
    - persist progress (sessionStorage or the server) so a refresh doesn't lose 10 minutes of work
    - put the step in the URL (?step=2) so Back/Forward work
    - show progress ("Step 2 of 4") and let users go back without losing data
    - move focus to the step heading when the step changes (screen readers)
```

```tsx
const steps = [
  { title: 'Account', fields: ['email', 'password'] },
  { title: 'Profile', fields: ['name', 'company'] },
  { title: 'Plan',    fields: ['plan'] },
] as const;

function Wizard() {
  const [step, setStep] = useState(0);
  const methods = useForm<WizardValues>({ resolver: zodResolver(wizardSchema), defaultValues, mode: 'onTouched' });
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [step]);   // announce the new step

  async function next() {
    const ok = await methods.trigger(steps[step].fields as any);   // validate this step only
    if (ok) setStep(s => s + 1);
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submitAll)}>
        <h2 ref={headingRef} tabIndex={-1}>Step {step + 1} of {steps.length}: {steps[step].title}</h2>
        {step === 0 && <AccountStep />}
        {step === 1 && <ProfileStep />}
        {step === 2 && <PlanStep />}
        {step > 0 && <button type="button" onClick={() => setStep(s => s - 1)}>Back</button>}
        {step < steps.length - 1
          ? <button type="button" onClick={next}>Next</button>
          : <button type="submit">Finish</button>}
      </form>
    </FormProvider>
  );
}
// ‼️ The "Next" button is type="button" — pressing Enter in a field would otherwise submit.
// Since the steps unmount, but shouldUnregister is false, their values are kept. ✅
```

---

## 17. File Uploads

```tsx
const MAX = 5 * 1024 * 1024;
const schema = z.object({
  avatar: z
    .instanceof(FileList)                                  // register() gives a FileList
    .refine(files => files.length === 1, 'Choose a file')
    .refine(files => files[0]?.size <= MAX, 'Max 5 MB')
    .refine(files => ['image/png', 'image/jpeg', 'image/webp'].includes(files[0]?.type), 'PNG, JPEG or WebP only'),
});
// ‼️ z.instanceof(FileList) breaks during SSR (FileList doesn't exist in Node).
// Guard with typeof window !== 'undefined', or validate a File in a Controller.

function AvatarForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const files = watch('avatar');
  const preview = useMemo(() => (files?.[0] ? URL.createObjectURL(files[0]) : null), [files]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);   // ‼️ free memory

  async function onSubmit({ avatar }) {
    const body = new FormData();
    body.append('avatar', avatar[0]);
    // ‼️ Don't set Content-Type yourself — the browser adds multipart/form-data WITH the boundary
    await fetch('/api/avatar', { method: 'POST', body });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="file" accept="image/png,image/jpeg,image/webp" {...register('avatar')} />
      {/* accept= only filters the picker — validate type/size anyway, and again on the server */}
      {preview && <img src={preview} alt="Preview" width={96} height={96} />}
      {errors.avatar && <p role="alert">{String(errors.avatar.message)}</p>}
      <button>Upload</button>
    </form>
  );
}
```

```text
LARGE FILES / PROGRESS
  - fetch() has no upload progress events; use XMLHttpRequest upload.onprogress, or a library.
  - Big files: upload directly to storage with a PRESIGNED URL (S3/GCS/R2) from your API,
    then submit the form with just the file key. Your server never streams the bytes.
  - Very large files: multipart/resumable uploads (S3 multipart, tus protocol).
  - Server: check size, type (sniff the bytes, don't trust the extension), scan if needed.
```

---

## 18. Autosave and Unsaved-Changes Warnings

```tsx
// ── Autosave: debounce, save only when valid and changed ────────────────────
function useAutosave(form: UseFormReturn<any>, save: (v: any) => Promise<void>, delay = 1000) {
  const values = useWatch({ control: form.control });
  const { isDirty } = form.formState;
  useEffect(() => {
    if (!isDirty) return;
    const id = setTimeout(async () => {
      const valid = await form.trigger();
      if (!valid) return;
      const snapshot = form.getValues();
      await save(snapshot);
      form.reset(snapshot, { keepValues: true });   // mark as saved (not dirty) without
    }, delay);                                      // touching what's on screen
    return () => clearTimeout(id);                  // ‼️ new edits restart the timer
  }, [values, isDirty, delay]);
}
// Show status ("Saving…", "Saved 10:42") with aria-live="polite".
// Guard against out-of-order responses: ignore a response if a newer save has started.
```

```tsx
// ── Warn before leaving with unsaved changes ────────────────────────────────
function useUnsavedChangesWarning(isDirty: boolean) {
  // 1. Tab close / reload / external navigation
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // 2. In-app navigation (React Router) — beforeunload does NOT fire for SPA route changes
  const blocker = useBlocker(isDirty);
  // render: blocker.state === 'blocked' → confirm dialog → blocker.proceed() / blocker.reset()
  return blocker;
}
// ‼️ After a successful save, reset() so isDirty becomes false BEFORE you navigate away,
// or your own redirect gets blocked.
```

---

## 19. Accessibility for Forms

```text
‼️ THE CHECKLIST

  LABELS
  - Every input has a visible <label htmlFor> (placeholder is NOT a label — it disappears
    and has poor contrast). Radio/checkbox groups: <fieldset> + <legend>.
  - Use useId() for ids so they're unique when the component renders twice.

  ERRORS
  - aria-invalid="true" on invalid fields.
  - aria-describedby pointing at the error text (and hint text).
  - Error text says how to fix it: "Enter a date like 2026-11-12", not "Invalid".
  - Don't rely on red color alone — include text or an icon.
  - On submit with errors: move focus to the first invalid field (RHF default), or to an
    error summary at the top listing links to each field (long forms).
  - Errors that appear without a submit (async) need announcing: role="alert" or an
    aria-live region. Don't make every field error role="alert" during typing — it's noisy.

  INPUTS
  - Correct type and autoComplete: type="email" autoComplete="email",
    autoComplete="new-password" on signup, "one-time-code" for OTP, "street-address", ...
    → password managers, autofill and mobile keyboards all work.
  - inputMode="numeric" / "decimal" for numeric keyboards without type="number" quirks.
  - Mark required fields (visible "*" with explanation, or "(optional)" on optional ones)
    and use required / aria-required.

  BUTTONS
  - ‼️ Don't disable the submit button just because the form is invalid. Users can't find
    out WHY it's disabled, and disabled buttons aren't focusable. Let them submit and show
    the errors. (Disabling while isSubmitting is fine.)
  - Real <button type="submit"> so Enter works.
```

---

## 20. UX Rules That Make Forms Feel Good

```text
  - Ask for less. Every field costs completions. Optional → remove or move later.
  - One column. Multi-column forms get skipped fields.
  - Labels above inputs; keep them visible while typing.
  - Validate on blur, re-validate on change (mode: 'onTouched').
  - Keep input on error. Never clear a form because the server said no.
  - Show what's happening: "Saving…", spinner in the button, success message.
  - Format-tolerant input: accept "(555) 123-4567" and "5551234567"; normalize in the
    schema (z.string().transform(...)) instead of rejecting.
  - Show password toggle (type="button"!) instead of "confirm password" where possible.
  - Long forms: sections with headings, save progress, show remaining steps.
  - Mobile: correct keyboards (type/inputMode), big touch targets, no tiny selects.
  - Dates: native <input type="date"> unless you need ranges (see the dates guide).
  - Destructive submits (delete account): confirmation with the consequence spelled out.
```

---

## 21. Performance — Why Big Forms Get Slow

```text
  CAUSE                                          FIX
  ─────────────────────────────────────────────  ──────────────────────────────────────────
  Controlled inputs in one big parent state      RHF (uncontrolled) — keystrokes don't
  → whole form re-renders per keystroke          re-render the form
  watch() at the top of the form                 useWatch in a small child component
  Reading formState.* you don't use              RHF subscribes per property you READ —
                                                 only destructure what you render
  mode: 'onChange' with an expensive schema      'onTouched'; split expensive async checks
                                                 out with debounce (§11)
  Huge field arrays (hundreds of rows)           virtualize rows; memo row components;
                                                 consider editing one row at a time
  New object/array defaults on every render      define defaultValues outside the component
                                                 or memoize
  Inline Controller render props re-creating     extract the field into its own component
  heavy children                                 (useController inside it)
```

```text
‼️ HOW RHF's formState SUBSCRIPTION WORKS

   formState is a Proxy. RHF tracks which properties your component READ during render
   and only re-renders it when THOSE change.
     const { errors } = formState;         → re-renders on error changes
     const { isDirty, isValid } = formState → also re-renders on dirty/valid changes
   So destructure what you need at the top of render (don't read it conditionally).
   useFormState({ control, name: 'email' }) → subscribe to one field's state in a child.
```

---

## 22. Testing Forms

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('shows validation errors and submits valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<SignupForm onSubmit={onSubmit} />);

  // Submit empty → errors appear
  await user.click(screen.getByRole('button', { name: /create account/i }));
  expect(await screen.findByText('Name is required')).toBeInTheDocument();
  expect(screen.getByLabelText(/name/i)).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText(/name/i)).toHaveFocus();     // first invalid field focused

  // Fill in → submit
  await user.type(screen.getByLabelText(/name/i), 'Ada');
  await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
  await user.type(screen.getByLabelText(/^password/i), 'secret123');
  await user.type(screen.getByLabelText(/confirm password/i), 'secret123');
  await user.click(screen.getByLabelText(/accept the terms/i));
  await user.click(screen.getByRole('button', { name: /create account/i }));

  // ‼️ validation and submit are async — wait for the call
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Ada', email: 'ada@example.com' }),
  ));
});

test('maps a server error onto the field', async () => {
  server.use(http.post('/api/projects', () =>
    HttpResponse.json({ fieldErrors: { name: ['A project with this name exists'] } }, { status: 422 })));
  const user = userEvent.setup();
  render(<CreateProjectForm />, { wrapper: QueryWrapper });
  await user.type(screen.getByLabelText(/name/i), 'Taskboard');
  await user.click(screen.getByRole('button', { name: /create/i }));
  expect(await screen.findByText('A project with this name exists')).toBeInTheDocument();
});
```

```text
TEST THE SCHEMA SEPARATELY — fast and exhaustive, no rendering:
  expect(signupSchema.safeParse({ ...valid, confirmPassword: 'x' }).success).toBe(false)
  Table-driven tests (it.each) for every rule; the component tests then cover wiring only.

Query by LABEL (getByLabelText) — if your test can't find a field by its label, a screen
reader user can't either. That's an accessibility test for free.
```

---

## 23. Common Pitfalls

```text
  Each entry:  ✗ symptom
                 why  → the cause
                 fix  → what to do

  ✗ ‼️ The page reloads on submit
      why  → no preventDefault (plain onSubmit), or the form has no handler
      fix  → handleSubmit(...) from RHF, or e.preventDefault(), or <form action={fn}>

  ✗ ‼️ "Add item" / "Next" / "Show password" submits the form
      why  → <button> defaults to type="submit"
      fix  → type="button" on every non-submit button

  ✗ "A component is changing an uncontrolled input to be controlled"
      why  → value started as undefined/null, later became a string
      fix  → default every field to '' (or false / []) — in useState and in defaultValues

  ✗ Edit form shows empty fields
      why  → defaultValues read once, data arrived later
      fix  → render the form after loading, reset(data), or the `values` option (§13)

  ✗ Number field value is a string / "" becomes 0
      why  → inputs always give strings; z.coerce.number('') → 0
      fix  → z.coerce with empty-to-undefined preprocess, or valueAsNumber (§4)

  ✗ Hidden conditional field blocks submit
      why  → its rule still runs while hidden
      fix  → discriminatedUnion / conditional schema; or shouldUnregister (§10)

  ✗ Wrong values appear after removing a row
      why  → key={index} in a field array
      fix  → key={field.id} (§9)

  ✗ Custom Select/DatePicker doesn't update the form
      why  → register() on a component that doesn't expose a native input / event
      fix  → Controller / useController (§7)

  ✗ Typing in a big form is laggy
      why  → controlled state at the top, or watch() of everything
      fix  → RHF uncontrolled inputs, useWatch in children (§21)

  ✗ isSubmitting is never true / button double-submits
      why  → onSubmit doesn't return/await the promise
      fix  → make onSubmit async and await the request (§12)

  ✗ Server errors only show in a toast
      why  → not mapped back to fields
      fix  → shared error shape + setError per field (§12)

  ✗ The user's input disappears after a server action error
      why  → React 19 resets uncontrolled fields after an action
      fix  → return the submitted values in state and use them as defaultValue (§14)

  ✗ useFormStatus().pending is always false
      why  → called in the component that renders <form>, not inside it
      fix  → call it in a child component rendered inside the form (§14)

  ✗ redirect() in a server action "throws" / is caught as an error
      why  → redirect works by throwing; your try/catch swallowed it
      fix  → call redirect after the try/catch (§15)

  ✗ Leaving the page right after a successful save shows "unsaved changes"
      why  → isDirty still true
      fix  → reset(savedValues) before navigating (§18)

  ✗ Client accepts it, server rejects / or the other way round
      why  → validation rules duplicated and drifted
      fix  → one shared Zod schema used on both sides (§4, §15)

  ✗ Submit button disabled and users don't know why
      why  → disabled={!isValid}
      fix  → keep it enabled, show errors on submit (§19)
```

---

## 24. Interview Questions

### "Controlled vs uncontrolled inputs?"

Controlled: React state holds the value and the input renders it (`value` + `onChange`) — you always know the value, at the cost of a re-render per keystroke. Uncontrolled: the DOM holds the value (`defaultValue`, read via ref or `FormData`) — fewer renders, works with native forms and React 19 actions. React Hook Form is built on uncontrolled inputs for performance.

### "Why React Hook Form over useState / Formik?"

It registers native inputs and reads them via refs, so typing doesn't re-render the whole form; `formState` is a proxy that re-renders only for the properties you read. It handles errors, touched/dirty tracking, field arrays, focus on error and schema resolvers. Formik keeps values in React state (more renders) and is less actively developed.

### "How do you share validation between client and server?"

One Zod schema in a shared module. The client uses it via `zodResolver`; the server calls `schema.safeParse` on the request body or `FormData`. `z.infer` gives the TypeScript type for both. Server errors come back in a consistent `{ fieldErrors }` shape and are mapped to fields with `setError`.

### "When do you show validation errors?"

After the user leaves a field (blur) or submits — not while they type the first characters. Once a field has an error, re-validate on change so it clears immediately. In RHF: `mode: 'onTouched'`, `reValidateMode: 'onChange'`.

### "What do `useActionState` and `useFormStatus` do?"

`useActionState(action, initial)` wraps a form action, returning the last result (`state`), a `formAction` for `<form action>`, and `isPending`. `useFormStatus` lets a component inside a form read that form's pending status — ideal for a reusable submit button. Actions run in a transition and reset uncontrolled fields on success.

### "How do you handle a dynamic list of fields?"

`useFieldArray` with `fields`, `append`, `remove`, `move`; key rows by `field.id`, never the index; register nested names like `items.${i}.qty`; validate with `z.array(...)` including array-level rules like `.min(1)`.

### "How do you prevent double submission?"

Disable the button while submitting (an awaited async `onSubmit` keeps `isSubmitting` true), and for critical operations send an idempotency key so the server ignores duplicates.

### "How do you make forms accessible?"

Visible labels tied with `htmlFor`/`id`, `fieldset`/`legend` for groups, `aria-invalid` and `aria-describedby` for errors, helpful error text, focus the first error on submit, correct `type`/`autoComplete`/`inputMode`, and don't disable the submit button for invalid forms.

---

## Related Files

- [BROWSER-DOM-EVENTS-DEEP.md](BROWSER-DOM-EVENTS-DEEP.md) — native form events, FormData, constraint validation, focus (§12–13)
- [JS-DATES-TIME-INTL-DEEP.md](JS-DATES-TIME-INTL-DEEP.md) — date inputs, number/currency formatting
- [REACT-ROUTING-DEEP.md](REACT-ROUTING-DEEP.md) — route actions, `useBlocker`, `<Form>` / fetchers
- [TANSTACK-QUERY-BASICS.md](TANSTACK-QUERY-BASICS.md) — mutations and invalidation after submit
- [REACT-TESTING-BASICS.md](REACT-TESTING-BASICS.md) — userEvent, MSW
- [TYPESCRIPT-DEEP.md](TYPESCRIPT-DEEP.md) — typing form values and handlers
- [../2-medium-priority/NEXTJS-DEEP.md](../2-medium-priority/NEXTJS-DEEP.md) — server actions
- [../3-low-priority/ACCESSIBILITY-MED-DEEP.md](../3-low-priority/ACCESSIBILITY-MED-DEEP.md) — accessible forms in depth
