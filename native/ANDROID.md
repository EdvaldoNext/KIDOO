# App Android KIDOO Filhos

A família **não** usa Android Studio no dia a dia.

No celular do filho: abrir o link `/entrar` → toque em **Instalar e permitir localização**. O Android mostra a janela de instalar e a de permissão.

O rastreador com o app **fechado** só fica completo quando o app estiver na Play Store (`NEXT_PUBLIC_KIDS_PLAY_STORE_URL`) ou instalado como APK nativo. O atalho do Chrome instala sozinho, mas o GPS some se a página fechar.

## 1. Ligar o rastreador

Em **Configurações**, marque **Ligar rastreador ao vivo**.

## 2. URL que o celular carrega

No `.env.local`:

- Emulador: `KIDOO_NATIVE_URL=http://10.0.2.2:3000`
- Celular na mesma rede: `KIDOO_NATIVE_URL=http://SEU-IP-DO-PC:3000`
- Produção: `KIDOO_NATIVE_URL=https://seu-dominio.vercel.app`

Depois:

```
npx cap sync android
```

## 3. Gerar e instalar

1. Abra a pasta `android` no Android Studio.
2. Conecte o celular com depuração USB (ou use um emulador).
3. Run no app `app.kidoo.kids`.
4. Na primeira abertura, entre como a criança.
5. Permita **localização precisa**.
6. Em **Ajustes → Apps → KIDOO Filhos → Localização**, escolha **Permitir o tempo todo**.
7. Deixe a notificação “Os pais podem ver onde você está” ligada.

O serviço nativo envia o GPS para `/api/family/live-location` mesmo com o app em segundo plano.
