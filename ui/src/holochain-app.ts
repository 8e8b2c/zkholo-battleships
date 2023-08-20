import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  AppAgentWebsocket,
  ActionHash,
  AppAgentClient,
} from '@holochain/client';
import { provide } from '@lit-labs/context';
import '@material/mwc-circular-progress';

import { clientContext } from './contexts';

@customElement('holochain-app')
export class HolochainApp extends LitElement {
  @state() loading = true;

  @provide({ context: clientContext })
  @property({ type: Object })
  client!: AppAgentClient;

  async firstUpdated() {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    this.client = await AppAgentWebsocket.connect('', 'battleships');

    this.loading = false;
  }

  render() {
    if (this.loading)
      return html`
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      `;

    return html`
      <main>
        <h1>Battleships</h1>

        <div id="content" style="display: flex; flex-direction: column; flex: 1;">
          <h2>EDIT ME! Add the components of your app here.</h2>
          
          <span>Look in the <code>ui/src/DNA/ZOME</code> folders for UI elements that are generated with <code>hc scaffold entry-type</code>, <code>hc scaffold collection</code> and <code>hc scaffold link-type</code> and add them here as appropriate.</span>
        
          <span>For example, if you have scaffolded a "todos" dna, a "todos" zome, a "todo_item" entry type, and a collection called "all_todos", you might want to add an element here to create and list your todo items, with the generated <code>ui/src/todos/todos/all-todos.ts</code> and <code>ui/src/todos/todos/create-todo.ts</code> elements.</span>
          
          <span>So, to use those elements here:</span>
          <ol>
            <li>Import the elements with:
              <pre>
import './todos/todos/all-todos';
import './todos/todos/create-todo';
              </pre>
            </li>
            <li>Replace this "EDIT ME!" section with <code>&lt;create-todo&gt;&lt;/create-todo&gt;&lt;all-todos&gt;&lt;/all-todos&gt;</code>.</li>
          </ol>
        </div>
      </main>
    `;
  }

  static styles = css`
    :host {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      font-size: calc(10px + 2vmin);
      color: #1a2b42;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      background-color: var(--lit-element-background-color);
    }

    main {
      flex-grow: 1;
    }

    .app-footer {
      font-size: calc(12px + 0.5vmin);
      align-items: center;
    }

    .app-footer a {
      margin-left: 5px;
    }
  `;
}
