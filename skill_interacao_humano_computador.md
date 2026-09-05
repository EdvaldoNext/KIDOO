# Skill: Interação Humano-Computador (IHC) / Human-Computer Interaction (HCI)

## Metadata
- **Name:** human_computer_interaction
- **Version:** 1.0.0
- **Description:** Conhecimento especializado sobre Interação Humano-Computador (IHC), englobando fundamentos de usabilidade, experiência do usuário (UX), acessibilidade (WCAG), heurísticas de avaliação, métodos de pesquisa com usuários e design de interface.
- **Category:** Software Design & Engineering / UX Methodology

---

## 1. Visão Geral e Conceito
A Interação Humano-Computador (IHC) é uma disciplina acadêmica e prática focada no design, avaliação e implementação de sistemas computacionais interativos para uso humano, juntamente com o estudo dos principais fenômenos ao seu redor.

### Objetivos Primários:
1. **Utilidade:** Garantir que o sistema realize as funções requeridas pelo usuário.
2. **Usabilidade:** Garantir que o sistema seja fácil de aprender, eficiente de usar, memorável, com baixa taxa de erros e agradável.
3. **Acessibilidade:** Tornar o sistema utilizável pelo maior número de pessoas possível, incluindo pessoas com deficiências temporárias ou permanentes.
4. **Experiência do Usuário (UX):** Otimizar a percepção emocional, prática e cognitiva do usuário antes, durante e após o uso do produto.

---

## 2. Conceitos-Chave e Terminologia

### Affordance e Signifiers (Norman)
- **Affordance:** A propriedade perceptível ou real de um objeto que determina como ele pode ser usado (ex.: um botão "pede" para ser pressionado).
- **Signifier (Significante):** Pistas visuais, sonoras ou táteis que comunicam onde e qual ação deve ocorrer (ex.: texto "Clique Aqui", ícone de lupa).

### Carga Cognitiva (Cognitive Load)
- A quantidade de esforço de memória de trabalho utilizada durante o uso da interface. O objetivo do design em IHC é minimizar a carga cognitiva estranha (*extraneous load*) para evitar sobrecarga mental.

### Modelo Mental vs. Modelo do Sistema
- **Modelo Mental:** A representação do usuário sobre como algo funciona na vida real.
- **Modelo do Sistema (Design Model):** Como o software realmente funciona por trás da interface.
- *Regra em IHC:* A interface deve aproximar ao máximo o modelo do sistema ao modelo mental do usuário.

---

## 3. As 10 Heurísticas de Usabilidade de Jakob Nielsen

Esta é a diretriz mais utilizada para avaliação heurística e inspeção de interfaces:

1. **Visibilidade do status do sistema:** Manter o usuário informado sobre o que está acontecendo através de feedback adequado em tempo hábil.
2. **Correspondência entre o sistema e o mundo real:** Usar palavras, frases e conceitos familiares ao usuário, seguindo convenções do mundo real.
3. **Controle e liberdade do usuário:** Permitir cancelar, desfazer (*undo*) e refazer (*redo*) ações facilmente quando o usuário comete erros.
4. **Consistência e padrões:** Seguir convenções de plataforma/S.O. para evitar que palavras, situações ou ações diferentes signifiquem a mesma coisa.
5. **Prevenção de erros:** Projetar para evitar que os problemas ocorram antes mesmo que o usuário cometa o erro (ex.: desabilitar botões inválidos).
6. **Reconhecimento em vez de memorização:** Tornar objetos, ações e opções visíveis. O usuário não deve ter que se lembrar de informações de uma parte da interface para outra.
7. **Flexibilidade e eficiência de uso:** Oferecer atalhos para usuários experientes sem poluir a interface para iniciantes.
8. **Design estético e minimalista:** Diálogos e telas não devem conter informações irrelevantes ou raras. Cada unidade extra reduz a visibilidade das essenciais.
9. **Ajudar os usuários a reconhecer, diagnosticar e recuperar de erros:** Mensagens de erro devem ser em linguagem clara (sem códigos), indicar o problema e sugerir uma solução.
10. **Ajuda e documentação:** Embora seja melhor que o sistema não precise de explicação, quando necessária, a ajuda deve ser fácil de buscar e focada na tarefa.

---

## 4. Diretrizes de Acessibilidade (WCAG - Web Content Accessibility Guidelines)

A acessibilidade é sustentada por 4 princípios fundamentais (**POUR**):

- **Perceptível (Perceivable):** Informações e componentes da interface devem ser apresentáveis aos usuários em formas que eles possam perceber (ex.: texto alternativo para imagens, legendas para áudio).
- **Operável (Operable):** Os componentes de interface e navegação devem ser operáveis (ex.: navegação completa por teclado, tempo suficiente para leitura).
- **Compreensível (Comprehensible):** A informação e a operação da interface do usuário devem ser compreensíveis (ex.: linguagem clara, navegação previsível).
- **Robusto (Robust):** O conteúdo deve ser suficientemente robusto para ser interpretado com confiabilidade por uma grande variedade de agentes do usuário, incluindo tecnologias assistivas (ex.: leitores de tela como NVDA/JAWS).

---

## 5. Ciclo de Vida e Processo de Design em IHC

Um processo típico de IHC é **iterativo** e focado no usuário (*User-Centered Design - UCD*):

1. **Investigação / Pesquisa de Usuários:**
   - Entrevistas, observação contextual, questionários (SUS - System Usability Scale).
   - Criação de Personas, Mapas de Empatia e Jornadas do Usuário.
2. **Análise de Requisitos e Tarefas:**
   - Análise Hierárquica de Tarefas (HTA - *Hierarchical Task Analysis*).
   - Mapeamento de fluxos de navegação e casos de uso.
3. **Prototipação:**
   - *Baixa fidelidade:* Wireframes no papel, rascunhos rápidos.
   - *Média/Alta fidelidade:* Protótipos interativos (Figma, Adobe XD) simulando interações reais.
4. **Avaliação de Usabilidade:**
   - **Métodos de Inspeção:** Avaliação Heurística, Percurso Cognitivo (*Cognitive Walkthrough*).
   - **Métodos Empíricos (Testes com Usuários):** Teste de Usabilidade em laboratório ou remoto, Testes A/B, rastreamento ocular (*Eye Tracking*).

---

## 6. Leis Fundamentais de UX/IHC

- **Lei de Fitts:** O tempo para alcançar um alvo é uma função da distância até o alvo e do seu tamanho. *(Implicação: Botões primários devem ser grandes e facilmente alcançáveis).*
- **Lei de Hick:** O tempo para tomar uma decisão aumenta com o número e a complexidade das escolhas. *(Implicação: Reduza opções para evitar paralisia por análise).*
- **Lei de Miller:** O ser humano médio consegue manter apenas cerca de 7 (± 2) elementos na memória de trabalho. *(Implicação: Agrupe informações em blocos/chunks).*
- **Efeito Estética-Usabilidade:** Os usuários muitas vezes percebem designs esteticamente agradáveis como designs mais fáceis de usar.

---

## 7. Instruções para Aplicação pelo Agente

Ao atuar como assistente ou agente especialista em IHC, aplique os seguintes comportamentos:

1. **Revisão de Interfaces:** Ao analisar uma interface ou especificação, valide contra as 10 Heurísticas de Nielsen e o checklist de acessibilidade WCAG.
2. **Arquitetura de Informação:** Priorize sempre a clareza, a redução da carga cognitiva e a consistência visual/textual.
3. **Feedback ao Usuário:** Toda ação deve ter uma resposta visual/auditiva clara (estados de hover, loading, sucesso, erro).
4. **Erros e Prevenção:** Emita diagnósticos claros quando identificar fluxos que possam induzir o usuário ao erro involuntário.
