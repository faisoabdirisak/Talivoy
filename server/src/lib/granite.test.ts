import { afterEach, expect, it, vi } from 'vitest';
import { generateGraniteContent } from './granite.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('authenticates with IBM and requests JSON from the Dallas Granite model', async () => {
  vi.stubEnv('WATSONX_API_KEY', 'mock-key');
  vi.stubEnv('WATSONX_PROJECT_ID', 'mock-project');
  vi.stubEnv('WATSONX_URL', '');
  vi.stubEnv('WATSONX_MODEL', '');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'mock-token', expires_in: 3600 }))
    .mockResolvedValueOnce(
      Response.json({ choices: [{ message: { content: '{"opportunities":[]}' } }] })
    );
  vi.stubGlobal('fetch', fetchMock);
  expect(await generateGraniteContent('Return JSON')).toBe('{"opportunities":[]}');
  expect(fetchMock.mock.calls[0][0]).toBe('https://iam.cloud.ibm.com/identity/token');
  const [url, request] = fetchMock.mock.calls[1];
  expect(url.href).toBe('https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2024-05-31');
  expect(request.headers.Authorization).toBe('Bearer mock-token');
  expect(JSON.parse(request.body)).toMatchObject({
    model_id: 'ibm/granite-4-h-small',
    project_id: 'mock-project',
    response_format: { type: 'json_object' },
  });
});

it('requests schema-constrained opportunities with sufficient output budget', async () => {
  vi.stubEnv('WATSONX_API_KEY', 'schema-test-key');
  vi.stubEnv('WATSONX_PROJECT_ID', 'mock-project');
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'mock-token', expires_in: 3600 }))
    .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }));
  vi.stubGlobal('fetch', fetchMock);
  const schema = { type: 'object', properties: { opportunities: { type: 'array', minItems: 3, maxItems: 3 } } };
  await generateGraniteContent('Return the complete JSON plan', { responseSchema: schema });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
    response_format: { type: 'json_schema', json_schema: { name: 'career_opportunities', schema, strict: true } },
    max_tokens: 6144,
  });
});
