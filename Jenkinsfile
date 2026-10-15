pipeline {
    agent any

    environment {
        NEXUS_URL = 'http://192.168.0.106:8081'
        NEXUS_REPO = 'kijaniokiosk-npm'
        NEXUS_CREDENTIAL_ID = 'nexus-creds'
        SEMVER = '1.0.0'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()

                script {
                    def checkoutInfo = git(
                        branch: 'feature/week5-ci-pipeline',
                        url: 'https://github.com/ob002/kijaniokiosk-devops-foundation-ip5.git'
                    )

                    env.GIT_SHA = checkoutInfo.GIT_COMMIT.take(7)
                    env.VERSION = "${env.SEMVER}-${env.GIT_SHA}"

                    echo "Commit: ${env.GIT_SHA}"
                    echo "Build version: ${env.VERSION}"
                }
            }
        }

        stage('Lint') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    set -eu
                    npm install
                    npm run lint
                '''
            }
        }

        stage('Build') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    set -eu
                    npm install
                    npm run build
                '''
            }
        }

        stage('Verify') {
            parallel {
                stage('Test') {
                    agent {
                        docker {
                            image 'node:20-alpine'
                            reuseNode true
                        }
                    }
                    steps {
                        sh '''
                            set -eu
                            npm install
                            npm test
                        '''
                    }
                }

                stage('Security Audit') {
                    agent {
                        docker {
                            image 'node:20-alpine'
                            reuseNode true
                        }
                    }
                    steps {
                        sh '''
                            set -eu
                            npm install
                            npm audit --audit-level=high
                        '''
                    }
                }
            }
        }

        stage('Archive') {
            steps {
                sh '''
                    set -eu
                    tar -czf "build-${VERSION}.tar.gz" dist package.json
                '''
                archiveArtifacts artifacts: "build-${VERSION}.tar.gz",
                    fingerprint: true
            }
        }

        stage('Publish') {
            agent {
                docker {
                    image 'node:20-alpine'
                    reuseNode true
                }
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: "${NEXUS_CREDENTIAL_ID}",
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {
                    sh '''
                        set +x
                        set -eu

                        REGISTRY="${NEXUS_URL}/repository/${NEXUS_REPO}/"
                        AUTH="$(printf '%s' "${NEXUS_USER}:${NEXUS_PASS}" | base64 | tr -d '\\n')"

                        printf '%s\\n' \
                          "//192.168.0.106:8081/repository/${NEXUS_REPO}/:_auth=${AUTH}" \
                          "registry=${REGISTRY}" \
                          "always-auth=true" > .npmrc

                        trap 'rm -f .npmrc' EXIT
                        npm publish --registry="${REGISTRY}"
                    '''
                }
            }
        }
    }

    post {
        always {
            cleanWs notFailBuild: true
            echo 'Pipeline execution finished.'
        }
        success {
            echo 'SUCCESS: CI pipeline completed.'
        }
        failure {
            echo 'FAILURE: Check the first failing stage in Console Output.'
        }
    }
}
