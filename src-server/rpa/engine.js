import { EventEmitter } from 'events';

class RPAEngine extends EventEmitter {
    constructor() {
        super();
        this.queues = {
            vtme: [],
            tim: []
        };
        this.status = {
            vtme: 'IDLE', // IDLE, RUNNING, PAUSED, ERROR
            tim: 'IDLE'
        };
        this.stats = {
            processedTim: 0,
            processedVtme: 0,
            errors: 0
        };
    }

    /**
     * Adiciona um pedido/job na fila específica
     */
    enqueue(type, jobData) {
        if (!this.queues[type]) throw new Error(`Fila desconhecida: ${type}`);
        this.queues[type].push(jobData);
        this.emit('enqueued', { type, jobData });
    }

    /**
     * Inicia o loop de processamento para um tipo de automação
     */
    async startProcessing(type, processorFn) {
        if (this.status[type] === 'RUNNING') return;
        this.status[type] = 'RUNNING';
        this.emit('started', type);

        console.log(`🚀 [RPA Engine] Motor de fila '${type}' INICIADO.`);

        while (this.status[type] === 'RUNNING') {
            if (this.queues[type].length > 0) {
                const job = this.queues[type].shift();
                try {
                    await processorFn(job);
                    if (type === 'tim') this.stats.processedTim++;
                    if (type === 'vtme') this.stats.processedVtme++;
                    this.emit('jobSuccess', { type, job });
                } catch (err) {
                    console.error(`❌ [RPA Engine] Erro processando job na fila '${type}':`, err);
                    this.stats.errors++;
                    this.emit('jobError', { type, job, error: err });
                    // Estratégia de retentativa simples: colocar no fim da fila
                    if (!job.retries) job.retries = 0;
                    if (job.retries < 3) {
                        job.retries++;
                        this.queues[type].push(job);
                    }
                }
            } else {
                // Aguarda novos jobs se a fila estiver vazia
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Pausa temporariamente uma fila (Ex: quando a TIM desloga)
     */
    pause(type) {
        this.status[type] = 'PAUSED';
        console.log(`⏸️ [RPA Engine] Motor '${type}' PAUSADO.`);
        this.emit('paused', type);
    }

    /**
     * Retoma uma fila pausada
     */
    resume(type, processorFn) {
        if (this.status[type] === 'PAUSED') {
            console.log(`▶️ [RPA Engine] Motor '${type}' RETOMADO.`);
            this.startProcessing(type, processorFn);
        }
    }

    stop(type) {
        this.status[type] = 'IDLE';
        console.log(`🛑 [RPA Engine] Motor '${type}' PARADO.`);
        this.emit('stopped', type);
    }

    getStats() {
        return {
            status: this.status,
            queueSize: {
                vtme: this.queues.vtme.length,
                tim: this.queues.tim.length
            },
            stats: this.stats
        };
    }
}

export const engine = new RPAEngine();
