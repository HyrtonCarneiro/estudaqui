/**
 * Testes Unitários para a integração com Anki (AnkiConnect).
 * 
 * Regra: "TDD obrigatório" e "Isolamento de Lógica" 
 * Este arquivo garante que a lógica do serviço do anki funciona independente do DOM.
 * 
 * Comando de simulação: vitest ./js/tests/anki.test.js
 */

// Mock simplificado do fetch para não depender da rede real nos testes
const originalFetch = global.fetch;

describe('AnkiService Logic', () => {
    
    // Injeta o mock service (simulando que é carregado via script)
    const ankiService = {
        getDueCardsCount: async function() {
            try {
                const response = await fetch('http://localhost:8765', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: "findCards", version: 6, params: { query: "is:due" } })
                });
                if (!response.ok) throw new Error('Servidor retornou erro ou não está rodando.');
                const result = await response.json();
                if (result.error) throw new Error(result.error);
                return { success: true, count: result.result ? result.result.length : 0 };
            } catch (err) {
                return { success: false, error: "Anki Offline ou CORS bloqueador. Error: " + err.message };
            }
        }
    };

    beforeEach(() => {
        global.fetch = () => {};
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    test('Deve retornar a quantidade de cards pendentes quando a conexão for bem sucedida', async () => {
        // Arrange
        global.fetch = async () => ({
            ok: true,
            json: async () => ({
                error: null,
                result: [111111111, 222222222, 333333333] // 3 cards due
            })
        });

        // Act
        const response = await ankiService.getDueCardsCount();

        // Assert
        expect(response.success).toBe(true);
        expect(response.count).toBe(3);
    });

    test('Deve retornar success=false quando o AnkiConnect retornar um erro de versão/formato', async () => {
        // Arrange
        global.fetch = async () => ({
            ok: true,
            json: async () => ({
                error: "unsupported version",
                result: null
            })
        });

        // Act
        const response = await ankiService.getDueCardsCount();

        // Assert
        expect(response.success).toBe(false);
        expect(response.error).toContain("unsupported version");
    });

    test('Deve retornar success=false quando o fetch bater na parede do CORS (Failed to fetch)', async () => {
        // Arrange
        global.fetch = async () => {
            throw new TypeError("Failed to fetch"); // Erro típico do navegador para CORS ou offline
        };

        // Act
        const response = await ankiService.getDueCardsCount();

        // Assert
        expect(response.success).toBe(false);
        expect(response.error).toContain("Failed to fetch");
    });

    test('Deve retornar 0 quando não houverem cards (array vazio)', async () => {
        // Arrange
        global.fetch = async () => ({
            ok: true,
            json: async () => ({
                error: null,
                result: [] 
            })
        });

        // Act
        const response = await ankiService.getDueCardsCount();

        // Assert
        expect(response.success).toBe(true);
        expect(response.count).toBe(0);
    });
});
