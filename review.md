# Отчет по проблемам в проекте Continue

## Оглавление

1. [Проблема с установкой зависимостей](#проблема-с-установкой-зависимостей)
2. [Проблема с extraBodyProperties в OpenAI провайдере](#проблема-с-extrabodyproperties-в-openai-провайдере)
3. [Анализ архитектуры](#анализ-архитектуры)
4. [Предложенные фиксы](#предложенные-фиксы)
5. [Рекомендации](#рекомендации)

## Проблема с установкой зависимостей (пофикшено)

### Описание

При запуске скрипта `install-dependencies.sh` происходит ошибка компиляции нативных зависимостей (sqlite3), связанная с несовместимостью версий Node.js и Python.

### Детали ошибки

```
npm error gyp ERR! configure error
npm error gyp ERR! stack Error: `gyp` failed with exit code: 1
npm error gyp ERR! stack     at ChildProcess.onCpExit (/Users/mak/Desktop/continue/core/node_modules/node-gyp/lib/configure.js:259:16)
npm error ModuleNotFoundError: No module named 'distutils'
```

### Корень проблемы

- **Node.js v23.6.0**: Слишком новая версия, не рекомендованная для проекта
- **Python 3.13.9**: Удалил модуль `distutils`, который все еще требуется старым версиям `node-gyp`
- **Проект рекомендует**: Node.js v20.19.0+

### Последствия

- Невозможно установить зависимости
- Проект не запускается

## Проблема с extraBodyProperties в OpenAI провайдере

### Описание

Параметры `extraBodyProperties` из YAML конфигурации игнорируются при формировании HTTP запросов в OpenAI провайдере, особенно параметр `stream`.

### Технические детали

#### Как работают extraBodyProperties

1. **YAML парсинг**: ✅ `extraBodyProperties` корректно парсятся через `requestOptionsSchema`
2. **Слияние конфигураций**: ✅ `mergeConfigYamlRequestOptions` правильно объединяет base/global конфигурации
3. **Передача в LLM**: ✅ `requestOptions` устанавливаются в `LLMOptions`
4. **Применение**: ❌ OpenAI провайдер не использует `requestOptions.extraBodyProperties`

#### Проблемный код в OpenAI.ts

```typescript
protected extraBodyProperties(): Record<string, any> {
  return {};  // <-- НЕ ИСПОЛЬЗУЕТ this.requestOptions.extraBodyProperties
}
```

#### Поток выполнения для stream параметра

**В `_streamFim` методе:**

```typescript
body: JSON.stringify({
  model: options.model,
  prompt: prefix,
  suffix: suffix,
  // ... другие параметры
  stream: true, // <-- ЯВНО ПРОПИСАНО
  ...this.extraBodyProperties(), // <-- ВОЗВРАЩАЕТ {}
});
```

**В `fetch.ts`:**

```typescript
if (requestOptions?.extraBodyProperties && typeof init?.body === "string") {
  const parsedBody = JSON.parse(init.body);
  updatedBody = JSON.stringify({
    ...parsedBody, // { stream: true, ... }
    ...requestOptions.extraBodyProperties, // { stream: false, ... }
  });
}
```

### Последствия

- `extraBodyProperties` из YAML конфигурации не влияют на HTTP запросы OpenAI
- Невозможно переопределить параметры вроде `stream`, `temperature` и т.д. через YAML
- Ограниченная гибкость конфигурации

## Анализ архитектуры

### Цепочка обработки extraBodyProperties

```
YAML Config → requestOptionsSchema → mergeConfigYamlRequestOptions → LLMOptions.requestOptions → BaseLLM.requestOptions → fetch.ts → HTTP Request
```

### Проблемные места

1. **OpenAI.extraBodyProperties()**: Не использует `this.requestOptions.extraBodyProperties`
2. **Уровень применения**: `extraBodyProperties` применяются на уровне fetch, а не на уровне LLM провайдера
3. **Hardcoded параметры**: В OpenAI `stream: true` явно прописан, игнорируя `completionOptions.stream`

### Сравнение с другими провайдерами

- **SageMaker**: Использует `this.requestOptions?.extraBodyProperties` напрямую в теле запроса
- **ContinueProxy**: Переопределяет метод для специфичных свойств
- **OpenAI**: Игнорирует `requestOptions.extraBodyProperties`

## Предложенные фиксы

### Фикс 1: Исправление extraBodyProperties в OpenAI ✅ ПРИМЕНЕН

**Файл:** `core/llm/llms/OpenAI.ts`

**Изменение:**

```typescript
protected extraBodyProperties(): Record<string, any> {
  return this.requestOptions?.extraBodyProperties || {};  // Было: return {};
}
```

**Результат:** `extraBodyProperties` из YAML будут применяться на уровне LLM провайдера, перезаписывая явные параметры вроде `stream: true`.

**ДОПОЛНИТЕЛЬНАЯ ПРОБЛЕМА ОБНАРУЖЕНА:** ❌ OpenAI адаптер тоже игнорировал `extraBodyProperties`!

**Фикс 1.1:** Исправлен OpenAI адаптер в `packages/openai-adapters/src/apis/OpenAI.ts`

```typescript
body: JSON.stringify({
  // ... остальные параметры
  stream: true,
  ...this.config.requestOptions?.extraBodyProperties,  // <-- ДОБАВЛЕНО
}),
```

**Статус:** ✅ Все фиксы применены и проект пересобран (20.01.2026)

### Фикс 2: Альтернативный подход - использование completionOptions.stream

**Файл:** `core/llm/llms/OpenAI.ts`

**Изменение в `_streamFim`:**

```typescript
stream: options.stream ?? true,  // Вместо stream: true
```

**Результат:** Позволяет переопределять stream через `defaultCompletionOptions.stream` в YAML.

### Фикс 3: Установка зависимостей

**Решение:**

```bash
# Использовать правильную версию Node.js
nvm install 20.19.0
nvm use 20.19.0

# Использовать Python 3.12 или младше
# Либо установить Python 3.12 через pyenv/brew
```

## Рекомендации

### Немедленные действия

1. **Установить Node.js v20.19.0** вместо v23.6.0
2. **Использовать Python 3.12** вместо 3.13
3. **Применить Фикс 1** для корректной работы `extraBodyProperties`

### Долгосрочные рекомендации

1. **Обновить документацию**: Уточнить требования к версиям Node.js и Python
2. **Добавить валидацию**: Проверять совместимость версий при установке
3. **Улучшить архитектуру**: Сделать применение `extraBodyProperties` consistent across all LLM providers
4. **Тестирование**: Добавить тесты для `extraBodyProperties` в каждом провайдере

### Архитектурные улучшения

1. **Стандартизировать extraBodyProperties**: Все провайдеры должны использовать единый подход
2. **Добавить логирование**: Логировать применение `extraBodyProperties` для отладки
3. **Валидация конфигурации**: Проверять корректность `extraBodyProperties` на этапе загрузки

### Тестирование

```yaml
# Пример тестирования extraBodyProperties
models:
  - name: "Test OpenAI"
    provider: openai
    model: gpt-4
    requestOptions:
      extraBodyProperties:
        stream: false
        temperature: 0.1
```

## Заключение

Основные проблемы связаны с:

1. **Несовместимостью версий** инструментов разработки
2. **Архитектурными недоработками** в обработке конфигурационных параметров

Предложенные фиксы позволят решить эти проблемы и улучшить стабильность и гибкость проекта.
