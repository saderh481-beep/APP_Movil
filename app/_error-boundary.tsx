import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY] Error capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <View style={s.card}>
            <Text style={s.icon}>⚠️</Text>
            <Text style={s.title}>Algo salió mal</Text>
            <Text style={s.message}>
              {this.state.error?.message || 'Error desconocido'}
            </Text>
            {__DEV__ && this.state.errorInfo && (
              <Text style={s.debug}>
                {this.state.errorInfo.componentStack}
              </Text>
            )}
            <TouchableOpacity style={s.btn} onPress={this.handleRetry}>
              <Text style={s.btnText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  debug: {
    fontSize: 10,
    color: Colors.gray400,
    fontFamily: 'monospace',
    marginBottom: 16,
    maxHeight: 100,
  },
  btn: {
    backgroundColor: Colors.guinda,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});