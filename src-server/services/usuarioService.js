import bcrypt from 'bcryptjs';
import { usuarioModel } from '../models/usuarioModel.js';

export const usuarioService = {
    async listarTodos() {
        return await usuarioModel.listarTodos();
    },

    async criar(nome, email, senha, perfil, executor, ip) {
        if (!nome || !email || !senha || !perfil) {
            throw new Error('Todos os campos são obrigatórios');
        }

        const existente = await usuarioModel.buscarPorEmail(email);
        if (existente) {
            throw new Error('Já existe um usuário cadastrado com este e-mail');
        }

        const hash = await bcrypt.hash(senha, 10);
        const novoUser = await usuarioModel.criarUsuario(nome, email, hash, perfil, true);

        // Registrar log
        await usuarioModel.registrarLogAcesso(
            executor.id,
            executor.nome,
            executor.perfil,
            `CADASTRO DE USUÁRIO: Criado usuário ${email} (${perfil})`,
            'Cadastro de Usuários',
            ip || '127.0.0.1'
        );

        return novoUser;
    },

    async atualizar(id, nome, email, perfil, ativo, executor, ip) {
        const usuarioExistente = await usuarioModel.buscarPorId(id);
        if (!usuarioExistente) {
            throw new Error('Usuário não encontrado');
        }

        // Verifica e-mail duplicado
        if (email !== usuarioExistente.email) {
            const outroUser = await usuarioModel.buscarPorEmail(email);
            if (outroUser) {
                throw new Error('E-mail já está sendo utilizado por outro usuário');
            }
        }

        const userAtualizado = await usuarioModel.atualizarUsuario(id, nome, email, perfil, ativo);

        // Registrar log
        let acao = `ALTERAÇÃO DE PERFIL/DADOS: Editado usuário ${email} (${perfil})`;
        if (Boolean(usuarioExistente.ativo) !== Boolean(ativo)) {
            acao += ` - Status alterado para: ${ativo ? 'ATIVO' : 'INATIVO'}`;
        }

        await usuarioModel.registrarLogAcesso(
            executor.id,
            executor.nome,
            executor.perfil,
            acao,
            'Cadastro de Usuários',
            ip || '127.0.0.1'
        );

        return userAtualizado;
    },

    async alterarSenha(id, senhaAntiga, novaSenha, executor, ip) {
        const user = await usuarioModel.buscarPorId(id);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Se o próprio usuário estiver alterando, exige a senha antiga (exceto no primeiro acesso se for a padrão, mas vamos exigir por segurança ou simplificar)
        // Se trocar_senha for true e a senha antiga bater, tudo certo.
        if (senhaAntiga) {
            const matches = await bcrypt.compare(senhaAntiga, user.senha_hash);
            if (!matches) {
                throw new Error('Senha atual incorreta');
            }
        }

        const hash = await bcrypt.hash(novaSenha, 10);
        await usuarioModel.atualizarSenha(id, hash, false); // trocar_senha = false

        // Registrar log
        await usuarioModel.registrarLogAcesso(
            user.id,
            user.nome,
            user.perfil,
            'ALTERAÇÃO DE SENHA: Senha alterada pelo próprio usuário',
            'Configurações/Troca de Senha',
            ip || '127.0.0.1'
        );

        return true;
    },

    async resetarSenhaForcado(id, novaSenha, executor, ip) {
        const user = await usuarioModel.buscarPorId(id);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        const hash = await bcrypt.hash(novaSenha, 10);
        await usuarioModel.atualizarSenha(id, hash, true); // trocar_senha = true (exige troca no prox login)

        // Registrar log
        await usuarioModel.registrarLogAcesso(
            executor.id,
            executor.nome,
            executor.perfil,
            `RESET DE SENHA: Senha do usuário ${user.email} resetada pelo administrador`,
            'Cadastro de Usuários',
            ip || '127.0.0.1'
        );

        return true;
    },

    async alterarStatus(id, ativo, executor, ip) {
        const user = await usuarioModel.buscarPorId(id);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        await usuarioModel.atualizarStatus(id, ativo);

        // Registrar log
        await usuarioModel.registrarLogAcesso(
            executor.id,
            executor.nome,
            executor.perfil,
            `STATUS ALTERADO: Usuário ${user.email} alterado para ${ativo ? 'ATIVO' : 'INATIVO'}`,
            'Cadastro de Usuários',
            ip || '127.0.0.1'
        );

        return true;
    },

    async excluir(id, executor, ip) {
        const user = await usuarioModel.buscarPorId(id);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        if (Number(user.id) === Number(executor.id)) {
            throw new Error('Você não pode excluir o seu próprio usuário');
        }

        await usuarioModel.excluirUsuario(id);

        // Registrar log
        await usuarioModel.registrarLogAcesso(
            executor.id,
            executor.nome,
            executor.perfil,
            `EXCLUSÃO DE USUÁRIO: Excluído usuário ${user.email}`,
            'Cadastro de Usuários',
            ip || '127.0.0.1'
        );

        return true;
    },

    async listarLogs(executor) {
        // Apenas ADMIN ou cargos elevados podem ver logs de auditoria
        if (executor.perfil !== 'ADMIN') {
            throw new Error('Acesso não autorizado aos logs de auditoria');
        }
        return await usuarioModel.listarLogs(100);
    }
};
