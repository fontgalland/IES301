import React, { useState, useEffect } from 'react';

import { confirmAlert } from 'react-confirm-alert';
import { MdAdd } from 'react-icons/md';
import { toast } from 'react-toastify';

import Loading from '~/components/Loading';
import history from '~/services/history';
import api from '~/services/api';
import { formatPrice } from '~/helpers/format';

import { Container, PlanList } from './styles';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const textAlignStyle = {
    textAlign: 'center',
  };

  useEffect(() => {
    const loadPlans = async () => {
      const response = await api.get('plans');

      setPlans(response.data);
      setLoading(false);
    };

    loadPlans();
  }, []);

  const handleEdit = id => {
    history.push(`/plans/${id}`);
  };

  const handleDelete = plan => {
    confirmAlert({
      title: 'Confirme a exclusão',
      message: `Deseja remover o plano ${plan.title} ?`,
      buttons: [
        {
          label: 'Sim',
          onClick: async () => {
            try {
              await api.delete(`plans/${plan.id}`);
              toast.success('Plano excluido com sucesso');
              setPlans(plans.filter(s => s.id !== plan.id));
            } catch (err) {
              toast.error(
                (err.response && err.response.data.error) ||
                  'Erro de comunicação com o servidor'
              );
            }
          },
        },
        {
          label: 'Não',
          onClick: () => '',
        },
      ],
    });
  };

  return (
    <Container>
      {loading ? (
        <Loading type="spinner" />
      ) : (
        <>
          <div>
            <h1>Gerenciando planos</h1>
            <div>
              <button type="button" onClick={() => history.push('/plans/new')}>
                <MdAdd size={18} />
                <span>CADASTRAR</span>
              </button>
            </div>
          </div>
          {!plans.length ? (
            <p>Nenhum plano encontrado...</p>
          ) : (
            <PlanList>
              <li>
                <strong>TÍTULO</strong>
                <strong style={textAlignStyle}>DURAÇÃO</strong>
                <strong style={textAlignStyle}>VALOR p/ MÊS</strong>
              </li>
              {plans.map(plan => (
                <li key={plan.id}>
                  <span>{plan.title}</span>
                  <span style={textAlignStyle}>{`${plan.duration} ${
                    plan.duration === 1 ? 'mês' : 'meses'
                  }`}</span>
                  <span style={textAlignStyle}>{formatPrice(plan.price)}</span>
                  <div>
                    <button type="button" onClick={() => handleEdit(plan.id)}>
                      editar
                    </button>
                    <button type="button" onClick={() => handleDelete(plan)}>
                      apagar
                    </button>
                  </div>
                </li>
              ))}
            </PlanList>
          )}
        </>
      )}
    </Container>
  );
}
