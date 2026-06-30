# Abdul & Aziza Invitation

Мобильное свадебное приглашение с анимированным конвертом, музыкой и таймером до торжества.

## Запуск

```powershell
npm.cmd install
npm.cmd run dev
```

Сборка:

```powershell
npm.cmd run build
```

## Где менять данные

Основные тексты и параметры события находятся в `src/content.ts`.

- Имена: `event.partners`
- Дата для первого экрана: `copy.heroDate`
- Дата и время таймера: `event.isoDate`
- Время начала: `event.time`
- Место и ссылка на карту: `event.venue`, `event.address`, `event.mapUrl`

## Персональная ссылка

На втором слайде можно заменить стандартное обращение через параметр `name`:

```text
https://h4nsk0y.github.io/abdul-aziza-invite/?name=Николас%20с%20супругой
```

Если параметра нет, показывается стандартный текст из `copy.dearTitle`.

## Генератор ссылок

Страница генератора находится по адресу:

```text
https://h4nsk0y.github.io/abdul-aziza-invite/#/links
```

На ней можно ввести одно имя вручную или загрузить Excel/CSV со списком гостей. Генератор берёт первый непустой текст из каждой строки и собирает персональные ссылки.

## Ассеты

- Главное фото: `public/couple.jpg`
- Фото во втором слайде: `public/intro-photo.jpg`
- Фото финального таймера: `public/countdown-photo.jpg`
- Музыка: `public/trek_1.mp3` — `public/trek_4.mp3`

Музыка запускается после открытия конверта. Треки выбираются из очереди без повторов, пока не проиграют все варианты.

## GitHub Pages

Workflow находится в `.github/workflows/deploy.yml`. После push в `main` сайт деплоится через GitHub Actions.
